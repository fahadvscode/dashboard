import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import {
  cancelBookingStatus,
  cancelCalendarEvent,
  findCalendarEventId,
  getBookingSupabase,
  getBrandContact,
  getBrandFromTable,
  getCalendarClient,
  getCalendarIdForTable,
  isValidBookingTable,
  normalizeAppointmentTime,
  updateBookingAppointment,
  updateCalendarEventTime,
} from '@/lib/bookingCalendar'
import { FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE } from '@/lib/interviewBookingConstants'
import { prepareInterviewBooking, syncInterviewReschedule } from '@/lib/interviewBookingSync'
import { appointmentToSlotIso } from '@/lib/interviewSlotTimes'
import { normalizeBookingPayload } from '@/lib/normalizeBookingPayload'
import { meetingCalendarLocation, meetingTypeLabel, parseMeetingType } from '@/lib/meetingTypes'

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function buildRescheduleSms(
  booking: {
    firstname: string
    appointment_date: string
    appointment_time: string
    meet_link?: string | null
    appointment_type?: string | null
    meeting_format?: string | null
  },
  brandName: string
) {
  const brandContact = getBrandContact(brandName)
  const meetingFormat = (booking.meeting_format || booking.appointment_type || '')
    .trim()
    .toLowerCase()

  let typeLine = `\n🎯 Type: ${meetingTypeLabel(meetingFormat)}`
  if (meetingFormat === 'google_meet' && booking.meet_link) {
    typeLine += `\n💻 Join here: ${booking.meet_link}`
  } else if (meetingFormat === 'visit_office') {
    typeLine += '\n🏢 Office visit — see your calendar invite for the address.'
  } else if (meetingFormat === 'builder_site_visit') {
    typeLine += '\n🏗️ Site visit — we will send the location before the appointment.'
  } else if (meetingFormat === 'phone_call') {
    typeLine += '\n📞 Phone call — we will call you at this number.'
  }

  return `Hi ${booking.firstname}, your appointment has been rescheduled.

📅 New date: ${booking.appointment_date}
🕐 New time: ${booking.appointment_time}${typeLine}

Questions? Call ${brandContact.phoneFormatted}

- ${brandName} Team`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table, bookingId, appointment_date, appointment_time, appointment_type, sendSms = true } = body

    if (!table || !bookingId || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'Table, booking ID, appointment date, and appointment time are required.' },
        { status: 400 }
      )
    }

    if (!isValidBookingTable(table)) {
      return NextResponse.json({ error: 'Invalid table name.' }, { status: 400 })
    }

    const normalizedTime = normalizeAppointmentTime(appointment_time)
    const supabase = await getBookingSupabase()

    const { data: booking, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    if (table === FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE) {
      const bookingRecord = booking as Record<string, unknown>
      const oldBooking = prepareInterviewBooking(bookingRecord)

      if (
        String(oldBooking.appointment_date || '') === appointment_date &&
        normalizeAppointmentTime(String(oldBooking.appointment_time || '')) === normalizedTime
      ) {
        return NextResponse.json(
          { error: 'The selected date and time are the same as the current appointment.' },
          { status: 400 }
        )
      }

      const slots = appointmentToSlotIso(appointment_date, normalizedTime)
      const { data: updatedRow, error: updateError } = await supabase
        .from(table)
        .update({
          slot_start: slots.slot_start,
          slot_end: slots.slot_end,
          last_sync_source: 'dashboard_reschedule',
        })
        .eq('id', bookingId)
        .select('*')
        .single()

      if (updateError || !updatedRow) {
        throw updateError || new Error('Unable to update interview booking.')
      }

      const newBooking = prepareInterviewBooking(updatedRow as Record<string, unknown>)
      const sync = await syncInterviewReschedule(
        oldBooking,
        newBooking,
        'from Property Dashboard',
        supabase,
        { sendCandidateSms: sendSms }
      )

      await supabase.from(table).update({ last_sync_source: null }).eq('id', bookingId)

      return NextResponse.json({
        success: true,
        booking: updatedRow,
        calendarUpdated: sync.calendarUpdated,
        calendarEventId: sync.calendarEventId,
        calendarWarning: sync.calendarWarning,
        smsSent: sync.candidateSms?.sent || false,
        smsError: sync.candidateSms?.error || null,
        candidateEmail: sync.candidateEmail,
        message: sync.calendarWarning
          ? 'Interview rescheduled in dashboard with warnings.'
          : 'Interview rescheduled successfully.',
      })
    }

    normalizeBookingPayload(booking as Record<string, unknown>)

    const currentType = parseMeetingType(booking.meeting_format || booking.appointment_type)
    const typeWasSent = appointment_type !== undefined && appointment_type !== null && String(appointment_type).trim() !== ''
    const nextType = typeWasSent ? parseMeetingType(appointment_type) : currentType
    if (typeWasSent && !nextType) {
      return NextResponse.json({ error: 'Choose a valid appointment type.' }, { status: 400 })
    }

    const timeChanged =
      booking.appointment_date !== appointment_date ||
      normalizeAppointmentTime(booking.appointment_time) !== normalizedTime
    const typeChanged = Boolean(nextType && nextType !== currentType)

    if (!timeChanged && !typeChanged) {
      return NextResponse.json(
        { error: 'The selected date, time, and type are the same as the current appointment.' },
        { status: 400 }
      )
    }

    const brandName = getBrandFromTable(table)
    const calendarId = getCalendarIdForTable(table)
    const previousDate = booking.appointment_date
    const previousTime = booking.appointment_time
    const brandPhone = getBrandContact(brandName).phoneFormatted

    let calendarUpdated = false
    let calendarEventId: string | null = booking.calendar_event_id || null
    let calendarWarning: string | null = null
    let createdMeetLink: string | null | undefined

    try {
      const calendar = await getCalendarClient()

      if (!calendarEventId) {
        calendarEventId = await findCalendarEventId(calendar, calendarId, {
          email: booking.email,
          firstname: booking.firstname,
          lastname: booking.lastname,
          appointment_date: previousDate,
          appointment_time: previousTime,
        })
      }

      if (calendarEventId) {
        const displayType = meetingTypeLabel(nextType)
        const patched = await updateCalendarEventTime(
          calendar,
          calendarId,
          calendarEventId,
          appointment_date,
          normalizedTime,
          typeChanged && nextType
            ? {
                summary: `${brandName} - Booking: ${booking.firstname} ${booking.lastname || ''}`.trim() +
                  (booking.project_name ? ` - ${booking.project_name}` : '') +
                  ` - ${displayType}`,
                location: meetingCalendarLocation(nextType, brandPhone),
                description: `Appointment type: ${displayType}\nCustomer: ${booking.firstname} ${booking.lastname || ''}\nEmail: ${booking.email}\nPhone: ${booking.phone || 'Not provided'}`,
                createGoogleMeet: nextType === 'google_meet',
              }
            : undefined
        )
        calendarUpdated = true
        if (typeChanged && nextType === 'google_meet') {
          createdMeetLink = patched.data.hangoutLink || null
        }
      } else {
        calendarWarning =
          'Booking updated in dashboard, but no matching Google Calendar event was found. Please update the calendar manually.'
      }
    } catch (calendarError) {
      console.error('Error updating calendar event during reschedule:', calendarError)
      calendarWarning =
        'Booking updated in dashboard, but Google Calendar could not be updated. Please update the calendar manually.'
    }

    const updatedBooking = await updateBookingAppointment(
      supabase,
      table,
      bookingId,
      appointment_date,
      normalizedTime,
      calendarEventId,
      {
        ...(nextType ? { appointment_type: nextType, meeting_format: nextType } : {}),
        ...(typeChanged
          ? { meet_link: nextType === 'google_meet' ? createdMeetLink ?? null : null }
          : {}),
      }
    )

    let smsSent = false
    let smsError: string | null = null

    if (sendSms && updatedBooking.phone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && twilioPhone) {
        try {
          const client = twilio(accountSid, authToken)
          const message = buildRescheduleSms(
            {
              firstname: updatedBooking.firstname,
              appointment_date,
              appointment_time: normalizedTime,
              meet_link: createdMeetLink || updatedBooking.meet_link,
              appointment_type: nextType || updatedBooking.appointment_type,
              meeting_format: nextType || updatedBooking.meeting_format,
            },
            brandName
          )

          const smsResponse = await client.messages.create({
            body: message,
            from: twilioPhone,
            to: toE164NorthAmerica(updatedBooking.phone),
          })

          smsSent = true

          try {
            await supabase.from('sms_conversations').insert({
              message_sid: smsResponse.sid,
              from_phone: twilioPhone,
              to_phone: updatedBooking.phone,
              message_body: message,
              direction: 'outbound',
              status: smsResponse.status,
              lead_name: `${updatedBooking.firstname} ${updatedBooking.lastname || ''}`.trim(),
              lead_id: updatedBooking.id,
              lead_table: table,
            })
          } catch (logError) {
            console.warn('Could not log reschedule SMS:', logError)
          }
        } catch (error) {
          console.error('Error sending reschedule SMS:', error)
          smsError = error instanceof Error ? error.message : 'Failed to send SMS'
        }
      } else {
        smsError = 'SMS service is not configured.'
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...updatedBooking,
        appointment_date,
        appointment_time: normalizedTime,
        appointment_type: nextType || updatedBooking.appointment_type,
        meeting_format: nextType || updatedBooking.meeting_format,
      },
      calendarUpdated,
      calendarEventId,
      calendarWarning,
      smsSent,
      smsError,
      message: calendarWarning
        ? 'Appointment rescheduled in dashboard with warnings.'
        : 'Appointment rescheduled successfully.',
    })
  } catch (error: unknown) {
    console.error('Error rescheduling booking:', error)
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : error instanceof Error
          ? error.message
          : 'Failed to reschedule booking.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
