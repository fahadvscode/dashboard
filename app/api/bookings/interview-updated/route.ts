import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import nodemailer from 'nodemailer'
import {
  cancelCalendarEvent,
  findCalendarEventId,
  getCalendarClient,
  getCalendarIdForTable,
  updateCalendarEventTime,
} from '@/lib/bookingCalendar'
import {
  INTERVIEW_BRAND_NAME,
  INTERVIEW_OFFICE_ADDRESS,
  FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
} from '@/lib/interviewBookingConstants'
import {
  getInterviewManageLinkHtml,
  getInterviewManageLinkSms,
  resolveInterviewManageUrl,
} from '@/lib/interviewManageUrl'
import {
  normalizeBookingPayload,
  resolveBookingFirstName,
  resolveBookingLastName,
} from '@/lib/normalizeBookingPayload'
import { isBookingStatusCanceled } from '@/lib/bookingTimes'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER
const notificationEmails = ['fahad@fahadsold.com', 'info@preconfactory.com']
const dashboardUrl = 'https://property-dashboard-three.vercel.app/interview-bookings'

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function prepareBooking(record: Record<string, unknown>) {
  const booking = {
    ...record,
    table_name: FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
  }
  normalizeBookingPayload(booking)
  booking.firstname = resolveBookingFirstName(booking)
  booking.lastname = resolveBookingLastName(booking)
  return booking
}

function slotOrTimeChanged(oldRecord: Record<string, unknown>, newRecord: Record<string, unknown>) {
  return (
    String(oldRecord.slot_start || '') !== String(newRecord.slot_start || '') ||
    String(oldRecord.slot_end || '') !== String(newRecord.slot_end || '') ||
    String(oldRecord.appointment_date || '') !== String(newRecord.appointment_date || '') ||
    String(oldRecord.appointment_time || '') !== String(newRecord.appointment_time || '')
  )
}

function getInterviewLocationSms(): string {
  return `\n🏢 Please arrive for your interview at:\n${INTERVIEW_OFFICE_ADDRESS}`
}

function buildInterviewRescheduleSms(
  booking: Record<string, unknown>,
  manageUrl: string | null,
  previousDate: string,
  previousTime: string
) {
  return `Hi ${booking.firstname}, your interview has been rescheduled.

Was: ${previousDate} at ${previousTime}
Now: ${booking.appointment_date || 'TBD'} at ${booking.appointment_time || 'TBD'}${getInterviewLocationSms()}${getInterviewManageLinkSms(manageUrl)}

- ${INTERVIEW_BRAND_NAME}`
}

function buildInterviewCancelSms(
  booking: Record<string, unknown>,
  appointmentDate: string,
  appointmentTime: string,
  manageUrl: string | null
) {
  return `Hi ${booking.firstname}, your interview on ${appointmentDate} at ${appointmentTime} has been cancelled.${getInterviewManageLinkSms(manageUrl)}

- ${INTERVIEW_BRAND_NAME}`
}

async function resolveCalendarEventId(
  booking: Record<string, unknown>,
  fallbackDate: string,
  fallbackTime: string
) {
  const calendarId = getCalendarIdForTable(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
  const calendar = await getCalendarClient()
  const storedId =
    typeof booking.calendar_event_id === 'string' ? booking.calendar_event_id.trim() : ''

  if (storedId) {
    return { calendar, calendarId, eventId: storedId }
  }

  const eventId = await findCalendarEventId(calendar, calendarId, {
    email: String(booking.email || ''),
    firstname: String(booking.firstname || ''),
    lastname: String(booking.lastname || ''),
    appointment_date: fallbackDate,
    appointment_time: fallbackTime,
  })

  return { calendar, calendarId, eventId }
}

async function sendAdminEmail(subject: string, html: string) {
  const results: { email: string; messageId?: string; error?: string }[] = []
  for (const email of notificationEmails) {
    try {
      const result = await emailTransporter.sendMail({
        from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
        to: email,
        subject,
        html,
      })
      results.push({ email, messageId: result.messageId })
    } catch (error) {
      results.push({
        email,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return results
}

async function sendCandidateSms(phone: string, body: string) {
  if (!accountSid || !authToken || !twilioPhone) {
    return { sent: false, error: 'Twilio not configured' }
  }
  const client = twilio(accountSid, authToken)
  const response = await client.messages.create({
    body,
    from: twilioPhone,
    to: toE164NorthAmerica(phone),
  })
  return { sent: true, sid: response.sid }
}

async function sendCandidateEmail(
  booking: Record<string, unknown>,
  subject: string,
  intro: string,
  manageUrl: string | null
) {
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <p>Hi <strong>${booking.firstname}</strong>,</p>
      <p>${intro}</p>
      <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0;">
        <p><strong>Date:</strong> ${booking.appointment_date || 'Not specified'}</p>
        <p><strong>Time:</strong> ${booking.appointment_time || 'Not specified'}</p>
        <p><strong>Location:</strong> ${INTERVIEW_OFFICE_ADDRESS}</p>
      </div>
      ${getInterviewManageLinkHtml(manageUrl)}
      <p><strong>Best regards,</strong><br>${INTERVIEW_BRAND_NAME}</p>
    </div>
  </body></html>`

  const result = await emailTransporter.sendMail({
    from: `"${INTERVIEW_BRAND_NAME}" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
    to: String(booking.email || ''),
    subject,
    html,
  })

  return result.messageId
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const oldRecord = (body.old_record || body.OLD || {}) as Record<string, unknown>
    const newRecord = (body.new_record || body.NEW || body) as Record<string, unknown>

    if (!newRecord.id) {
      return NextResponse.json({ error: 'Missing booking record.' }, { status: 400 })
    }

    const oldBooking = prepareBooking(oldRecord)
    const newBooking = prepareBooking(newRecord)
    const manageUrl = resolveInterviewManageUrl(newBooking)

    const wasCancelled = isBookingStatusCanceled(oldBooking.status)
    const isCancelled = isBookingStatusCanceled(newBooking.status)
    const becameCancelled = !wasCancelled && isCancelled
    const rescheduled =
      !isCancelled && slotOrTimeChanged(oldBooking, newBooking) && !becameCancelled

    if (!becameCancelled && !rescheduled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'No interview reschedule or cancellation change detected.',
      })
    }

    const previousDate = String(oldBooking.appointment_date || 'TBD')
    const previousTime = String(oldBooking.appointment_time || 'TBD')
    let calendarUpdated = false
    let calendarWarning: string | null = null
    let candidateSms: { sent: boolean; sid?: string; error?: string } | null = null
    let candidateEmail: string | null = null
    let adminEmails: Awaited<ReturnType<typeof sendAdminEmail>> = []

    if (becameCancelled) {
      try {
        const { calendar, calendarId, eventId } = await resolveCalendarEventId(
          newBooking,
          previousDate,
          previousTime
        )
        if (eventId) {
          await cancelCalendarEvent(calendar, calendarId, eventId)
          calendarUpdated = true
        } else {
          calendarWarning =
            'Interview cancelled in database, but no matching Google Calendar event was found.'
        }
      } catch (error) {
        console.error('Interview cancel calendar error:', error)
        calendarWarning =
          'Interview cancelled in database, but Google Calendar could not be updated.'
      }

      if (newBooking.phone) {
        try {
          candidateSms = await sendCandidateSms(
            String(newBooking.phone),
            buildInterviewCancelSms(newBooking, previousDate, previousTime, manageUrl)
          )
        } catch (error) {
          candidateSms = {
            sent: false,
            error: error instanceof Error ? error.message : 'Failed to send SMS',
          }
        }
      }

      adminEmails = await sendAdminEmail(
        `Interview cancelled — ${newBooking.firstname} ${newBooking.lastname || ''}`.trim(),
        `<p><strong>Interview cancelled</strong> (via fahadsells.com manage page)</p>
         <p><strong>Candidate:</strong> ${newBooking.firstname} ${newBooking.lastname || ''}</p>
         <p><strong>Was scheduled:</strong> ${previousDate} at ${previousTime}</p>
         <p><a href="${dashboardUrl}">View in Dashboard</a></p>`
      )
    }

    if (rescheduled) {
      try {
        const { calendar, calendarId, eventId } = await resolveCalendarEventId(
          newBooking,
          previousDate,
          previousTime
        )
        if (eventId) {
          await updateCalendarEventTime(
            calendar,
            calendarId,
            eventId,
            String(newBooking.appointment_date || ''),
            String(newBooking.appointment_time || '')
          )
          calendarUpdated = true
        } else {
          calendarWarning =
            'Interview rescheduled in database, but no matching Google Calendar event was found. Create or move the event manually.'
        }
      } catch (error) {
        console.error('Interview reschedule calendar error:', error)
        calendarWarning =
          'Interview rescheduled in database, but Google Calendar could not be updated.'
      }

      if (newBooking.phone) {
        try {
          candidateSms = await sendCandidateSms(
            String(newBooking.phone),
            buildInterviewRescheduleSms(newBooking, manageUrl, previousDate, previousTime)
          )
        } catch (error) {
          candidateSms = {
            sent: false,
            error: error instanceof Error ? error.message : 'Failed to send SMS',
          }
        }
      }

      try {
        candidateEmail = await sendCandidateEmail(
          newBooking,
          `Interview rescheduled — ${newBooking.appointment_date || 'Upcoming'} at ${newBooking.appointment_time || 'TBD'}`,
          'Your interview has been rescheduled. Here are your updated details:',
          manageUrl
        )
      } catch (error) {
        console.error('Interview reschedule email error:', error)
      }

      adminEmails = await sendAdminEmail(
        `Interview rescheduled — ${newBooking.firstname} ${newBooking.lastname || ''}`.trim(),
        `<p><strong>Interview rescheduled</strong> (via fahadsells.com manage page)</p>
         <p><strong>Candidate:</strong> ${newBooking.firstname} ${newBooking.lastname || ''}</p>
         <p><strong>Previous:</strong> ${previousDate} at ${previousTime}</p>
         <p><strong>New:</strong> ${newBooking.appointment_date || 'TBD'} at ${newBooking.appointment_time || 'TBD'}</p>
         <p><a href="${dashboardUrl}">View in Dashboard</a></p>`
      )
    }

    return NextResponse.json({
      success: true,
      change: becameCancelled ? 'cancelled' : 'rescheduled',
      calendarUpdated,
      calendarWarning,
      candidateSms,
      candidateEmail,
      adminEmails,
    })
  } catch (error) {
    console.error('Error syncing interview booking update:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync interview booking update',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
