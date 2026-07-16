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
} from '@/lib/bookingCalendar'

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function buildCancelSms(
  booking: { firstname: string; appointment_date: string; appointment_time: string },
  brandName: string
) {
  const brandContact = getBrandContact(brandName)
  return `Hi ${booking.firstname}, your appointment on ${booking.appointment_date} at ${booking.appointment_time} has been cancelled.

To book a new time, please contact us at ${brandContact.phoneFormatted}.

- ${brandName} Team`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table, bookingId, sendSms = true } = body

    if (!table || !bookingId) {
      return NextResponse.json({ error: 'Table and booking ID are required.' }, { status: 400 })
    }

    if (!isValidBookingTable(table)) {
      return NextResponse.json({ error: 'Invalid table name.' }, { status: 400 })
    }

    const supabase = await getBookingSupabase()
    const { data: booking, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    if (String(booking.status || '').toLowerCase() === 'cancelled') {
      return NextResponse.json({ error: 'This appointment is already cancelled.' }, { status: 400 })
    }

    const brandName = getBrandFromTable(table)
    const calendarId = getCalendarIdForTable(table)
    let calendarUpdated = false
    let calendarEventId: string | null = booking.calendar_event_id || null
    let calendarWarning: string | null = null

    try {
      const calendar = await getCalendarClient()

      if (!calendarEventId) {
        calendarEventId = await findCalendarEventId(calendar, calendarId, {
          email: booking.email,
          firstname: booking.firstname,
          lastname: booking.lastname,
          appointment_date: booking.appointment_date,
          appointment_time: booking.appointment_time,
        })
      }

      if (calendarEventId) {
        await cancelCalendarEvent(calendar, calendarId, calendarEventId)
        calendarUpdated = true
      } else {
        calendarWarning =
          'Appointment cancelled in dashboard, but no matching Google Calendar event was found. Please remove it manually.'
      }
    } catch (calendarError) {
      console.error('Error cancelling calendar event:', calendarError)
      calendarWarning =
        'Appointment cancelled in dashboard, but Google Calendar could not be updated. Please remove the event manually.'
    }

    const updatedBooking = await cancelBookingStatus(supabase, table, bookingId)

    let smsSent = false
    let smsError: string | null = null

    if (sendSms && updatedBooking.phone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER

      if (accountSid && authToken && twilioPhone) {
        try {
          const client = twilio(accountSid, authToken)
          const message = buildCancelSms(
            {
              firstname: updatedBooking.firstname,
              appointment_date: booking.appointment_date,
              appointment_time: booking.appointment_time,
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
            console.warn('Could not log cancel SMS:', logError)
          }
        } catch (error) {
          console.error('Error sending cancel SMS:', error)
          smsError = error instanceof Error ? error.message : 'Failed to send SMS'
        }
      } else {
        smsError = 'SMS service is not configured.'
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      calendarUpdated,
      calendarEventId,
      calendarWarning,
      smsSent,
      smsError,
      message: calendarWarning
        ? 'Appointment cancelled in dashboard with warnings.'
        : 'Appointment cancelled successfully.',
    })
  } catch (error: unknown) {
    console.error('Error cancelling booking:', error)
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : error instanceof Error
          ? error.message
          : 'Failed to cancel booking.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
