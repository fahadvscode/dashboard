import type { SupabaseClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import nodemailer from 'nodemailer'
import type { calendar_v3 } from 'googleapis'
import {
  cancelCalendarEvent,
  findCalendarEventId,
  getCalendarClient,
  getCalendarIdForTable,
  updateCalendarEventTime,
} from '@/lib/bookingCalendar'
import {
  FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
  INTERVIEW_BRAND_NAME,
  INTERVIEW_OFFICE_ADDRESS,
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

const notificationEmails = ['fahad@fahadsold.com', 'info@preconfactory.com']
const dashboardUrl = 'https://property-dashboard-three.vercel.app/interview-bookings'

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export type InterviewBookingRecord = Record<string, unknown>

export function prepareInterviewBooking(record: InterviewBookingRecord): InterviewBookingRecord {
  const booking = {
    ...record,
    table_name: FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
  }
  normalizeBookingPayload(booking)
  booking.firstname = resolveBookingFirstName(booking)
  booking.lastname = resolveBookingLastName(booking)
  return booking
}

export function interviewSlotOrTimeChanged(
  oldRecord: InterviewBookingRecord,
  newRecord: InterviewBookingRecord
) {
  return (
    String(oldRecord.slot_start || '') !== String(newRecord.slot_start || '') ||
    String(oldRecord.slot_end || '') !== String(newRecord.slot_end || '') ||
    String(oldRecord.appointment_date || '') !== String(newRecord.appointment_date || '') ||
    String(oldRecord.appointment_time || '') !== String(newRecord.appointment_time || '')
  )
}

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function getInterviewLocationSms(): string {
  return `\n🏢 Please arrive for your interview at:\n${INTERVIEW_OFFICE_ADDRESS}`
}

function buildInterviewRescheduleSms(
  booking: InterviewBookingRecord,
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
  booking: InterviewBookingRecord,
  appointmentDate: string,
  appointmentTime: string,
  manageUrl: string | null
) {
  return `Hi ${booking.firstname}, your interview on ${appointmentDate} at ${appointmentTime} has been cancelled.${getInterviewManageLinkSms(manageUrl)}

- ${INTERVIEW_BRAND_NAME}`
}

function getDayBoundsAround(dateStr: string, radiusDays: number) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const center = Date.UTC(year, month - 1, day, 12, 0, 0)
  const min = new Date(center - radiusDays * 24 * 60 * 60 * 1000)
  const max = new Date(center + (radiusDays + 1) * 24 * 60 * 60 * 1000)
  return { timeMin: min.toISOString(), timeMax: max.toISOString() }
}

export async function findInterviewCalendarEventId(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  booking: InterviewBookingRecord,
  lookupDate: string,
  lookupTime: string
): Promise<string | null> {
  const storedId =
    typeof booking.calendar_event_id === 'string' ? booking.calendar_event_id.trim() : ''
  if (storedId) return storedId

  const prepared = prepareInterviewBooking({
    ...booking,
    appointment_date: lookupDate,
    appointment_time: lookupTime,
  })

  const exact = await findCalendarEventId(calendar, calendarId, {
    email: String(prepared.email || ''),
    firstname: String(prepared.firstname || ''),
    lastname: String(prepared.lastname || ''),
    appointment_date: String(prepared.appointment_date || lookupDate),
    appointment_time: String(prepared.appointment_time || lookupTime),
  })
  if (exact) return exact

  const customerEmail = String(prepared.email || '').trim().toLowerCase()
  const firstname = String(prepared.firstname || '').toLowerCase()
  const fullName = `${prepared.firstname || ''} ${prepared.lastname || ''}`.trim().toLowerCase()
  const { timeMin, timeMax } = getDayBoundsAround(lookupDate, 2)

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
    q: String(prepared.email || '').trim(),
  })

  const events = response.data.items || []
  for (const event of events) {
    const summary = (event.summary || '').toLowerCase()
    const attendeeMatch = event.attendees?.some(
      (attendee) => attendee.email?.toLowerCase() === customerEmail
    )
    const interviewMatch = summary.includes('interview')
    const nameMatch =
      (firstname && summary.includes(firstname)) ||
      (fullName.length > 2 && summary.includes(fullName))

    if (attendeeMatch && (interviewMatch || nameMatch)) {
      return event.id || null
    }
  }

  return null
}

async function persistCalendarEventId(
  supabase: SupabaseClient | null,
  bookingId: string,
  eventId: string | null
) {
  if (!supabase || !eventId) return
  try {
    await supabase
      .from(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
      .update({ calendar_event_id: eventId })
      .eq('id', bookingId)
  } catch (error) {
    console.warn('Could not persist interview calendar_event_id:', error)
  }
}

async function sendAdminEmail(subject: string, html: string, sourceLabel: string) {
  const results: { email: string; messageId?: string; error?: string }[] = []
  for (const email of notificationEmails) {
    try {
      const result = await emailTransporter.sendMail({
        from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
        to: email,
        subject,
        html: html.replace('{{source}}', sourceLabel),
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

async function dispatchCandidateSms(phone: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
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

async function dispatchCandidateEmail(
  booking: InterviewBookingRecord,
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

export interface InterviewSyncResult {
  calendarUpdated: boolean
  calendarEventId: string | null
  calendarWarning: string | null
  candidateSms: { sent: boolean; sid?: string; error?: string } | null
  candidateEmail: string | null
  adminEmails: Awaited<ReturnType<typeof sendAdminEmail>>
}

export async function syncInterviewCancellation(
  oldBooking: InterviewBookingRecord,
  newBooking: InterviewBookingRecord,
  sourceLabel: string,
  supabase: SupabaseClient | null = null,
  options: { sendCandidateSms?: boolean } = {}
): Promise<InterviewSyncResult> {
  const sendCandidateSms = options.sendCandidateSms !== false
  const previousDate = String(oldBooking.appointment_date || 'TBD')
  const previousTime = String(oldBooking.appointment_time || 'TBD')
  const manageUrl = resolveInterviewManageUrl(newBooking)
  let calendarUpdated = false
  let calendarEventId: string | null = null
  let calendarWarning: string | null = null
  let candidateSms: InterviewSyncResult['candidateSms'] = null
  let candidateEmail: string | null = null

  try {
    const calendar = await getCalendarClient()
    const calendarId = getCalendarIdForTable(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
    calendarEventId = await findInterviewCalendarEventId(
      calendar,
      calendarId,
      newBooking,
      previousDate,
      previousTime
    )
    if (calendarEventId) {
      await cancelCalendarEvent(calendar, calendarId, calendarEventId)
      calendarUpdated = true
      await persistCalendarEventId(supabase, String(newBooking.id || ''), null)
    } else {
      calendarWarning =
        'Interview cancelled in database, but no matching Google Calendar event was found.'
    }
  } catch (error) {
    console.error('Interview cancel calendar error:', error)
    calendarWarning = 'Interview cancelled in database, but Google Calendar could not be updated.'
  }

  if (sendCandidateSms && newBooking.phone) {
    try {
      candidateSms = await dispatchCandidateSms(
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

  const adminEmails = await sendAdminEmail(
    `Interview cancelled — ${newBooking.firstname} ${newBooking.lastname || ''}`.trim(),
    `<p><strong>Interview cancelled</strong> ({{source}})</p>
     <p><strong>Candidate:</strong> ${newBooking.firstname} ${newBooking.lastname || ''}</p>
     <p><strong>Was scheduled:</strong> ${previousDate} at ${previousTime}</p>
     <p><a href="${dashboardUrl}">View in Dashboard</a></p>`,
    sourceLabel
  )

  return {
    calendarUpdated,
    calendarEventId,
    calendarWarning,
    candidateSms,
    candidateEmail,
    adminEmails,
  }
}

export async function syncInterviewReschedule(
  oldBooking: InterviewBookingRecord,
  newBooking: InterviewBookingRecord,
  sourceLabel: string,
  supabase: SupabaseClient | null = null,
  options: { sendCandidateSms?: boolean; sendCandidateEmail?: boolean } = {}
): Promise<InterviewSyncResult> {
  const sendCandidateSms = options.sendCandidateSms !== false
  const sendCandidateEmail = options.sendCandidateEmail !== false
  const previousDate = String(oldBooking.appointment_date || 'TBD')
  const previousTime = String(oldBooking.appointment_time || 'TBD')
  const manageUrl = resolveInterviewManageUrl(newBooking)
  let calendarUpdated = false
  let calendarEventId: string | null = null
  let calendarWarning: string | null = null
  let candidateSms: InterviewSyncResult['candidateSms'] = null
  let candidateEmail: string | null = null

  try {
    const calendar = await getCalendarClient()
    const calendarId = getCalendarIdForTable(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
    calendarEventId = await findInterviewCalendarEventId(
      calendar,
      calendarId,
      newBooking,
      previousDate,
      previousTime
    )
    if (calendarEventId) {
      await updateCalendarEventTime(
        calendar,
        calendarId,
        calendarEventId,
        String(newBooking.appointment_date || ''),
        String(newBooking.appointment_time || '')
      )
      calendarUpdated = true
      await persistCalendarEventId(supabase, String(newBooking.id || ''), calendarEventId)
    } else {
      calendarWarning =
        'Interview rescheduled in database, but no matching Google Calendar event was found. Update the calendar manually.'
    }
  } catch (error) {
    console.error('Interview reschedule calendar error:', error)
    calendarWarning = 'Interview rescheduled in database, but Google Calendar could not be updated.'
  }

  if (sendCandidateSms && newBooking.phone) {
    try {
      candidateSms = await dispatchCandidateSms(
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

  if (sendCandidateEmail) {
    try {
      candidateEmail = await dispatchCandidateEmail(
        newBooking,
        `Interview rescheduled — ${newBooking.appointment_date || 'Upcoming'} at ${newBooking.appointment_time || 'TBD'}`,
        'Your interview has been rescheduled. Here are your updated details:',
        manageUrl
      )
    } catch (error) {
      console.error('Interview reschedule email error:', error)
    }
  }

  const adminEmails = await sendAdminEmail(
    `Interview rescheduled — ${newBooking.firstname} ${newBooking.lastname || ''}`.trim(),
    `<p><strong>Interview rescheduled</strong> ({{source}})</p>
     <p><strong>Candidate:</strong> ${newBooking.firstname} ${newBooking.lastname || ''}</p>
     <p><strong>Previous:</strong> ${previousDate} at ${previousTime}</p>
     <p><strong>New:</strong> ${newBooking.appointment_date || 'TBD'} at ${newBooking.appointment_time || 'TBD'}</p>
     <p><a href="${dashboardUrl}">View in Dashboard</a></p>`,
    sourceLabel
  )

  return {
    calendarUpdated,
    calendarEventId,
    calendarWarning,
    candidateSms,
    candidateEmail,
    adminEmails,
  }
}
