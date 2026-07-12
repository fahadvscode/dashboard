import { createClient } from '@supabase/supabase-js'
import type { calendar_v3 } from 'googleapis'
import {
  BOOKING_TIMEZONE,
  buildAppointmentDateTimes,
} from '@/lib/bookingTimes'

export {
  BOOKING_TIMEZONE,
  OFFICE_ADDRESS,
  VALID_BOOKING_TABLES,
  type BookingTable,
  isValidBookingTable,
  getBrandFromTable,
  getBrandContact,
  getReminderResetFields,
  buildAppointmentDateTimes,
  parseAppointmentTime,
  formatAppointmentTime,
  APPOINTMENT_TIME_SLOTS,
  normalizeAppointmentTime,
} from '@/lib/bookingTimes'

export const CALENDAR_IDS = {
  fj: 'c_c0a660e131ad53344fa1d41404b0beafcde60bc4ea44e19020ad14eb84bcd46d@group.calendar.google.com',
  precon:
    'c_30f7e817768b30f4813c9711b2f66fa238221af7a6ba0fb5d284de514afeb400@group.calendar.google.com',
  gtalowrise:
    'c_c702f7be6ca9312d4fccf118aaff244390379e2b07f3f5ef47b3ee609fa49475@group.calendar.google.com',
}

export function getCalendarIdForTable(tableName: string): string {
  if (tableName.includes('gta_lowrise') || tableName.includes('gtalowrise')) {
    return CALENDAR_IDS.gtalowrise
  }
  if (tableName.includes('precon')) {
    return CALENDAR_IDS.precon
  }
  return CALENDAR_IDS.fj
}

export function getCalendarTeamEmails(tableName: string): string[] {
  if (tableName.includes('precon')) {
    return ['fahad@fahadsold.com', 'info@preconfactory.com']
  }
  if (tableName.includes('gta_lowrise') || tableName.includes('gtalowrise')) {
    return ['fahad@fahadsold.com']
  }
  return ['fahad@fahadsold.com']
}

function getDayBounds(dateStr: string) {
  return {
    timeMin: `${dateStr}T00:00:00Z`,
    timeMax: `${dateStr}T23:59:59Z`,
  }
}

export async function getBookingSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database is not configured.')
  }
  return createClient(supabaseUrl, supabaseKey)
}

export async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  const { google } = await import('googleapis')
  const supabase = await getBookingSupabase()

  const oauth2Client = new google.auth.OAuth2(
    process.env.QIKFILL_GOOGLE_CLIENT_ID,
    process.env.QIKFILL_GOOGLE_CLIENT_SECRET
  )

  const { data: tokenData, error } = await supabase
    .from('calendar_tokens')
    .select('*')
    .eq('calendar_type', 'qikfill')
    .single()

  if (error || !tokenData) {
    throw new Error('Qikfill calendar not authorized. Please authorize the calendar at /api/calendar/oauth')
  }

  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  })

  if (tokenData.expiry_date && new Date(tokenData.expiry_date) <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await supabase
      .from('calendar_tokens')
      .update({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      })
      .eq('calendar_type', 'qikfill')
    oauth2Client.setCredentials(credentials)
  }

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function findCalendarEventId(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  booking: {
    email: string
    firstname: string
    lastname?: string | null
    appointment_date: string
    appointment_time: string
  }
): Promise<string | null> {
  const { timeMin, timeMax } = getDayBounds(booking.appointment_date)
  const customerEmail = booking.email.trim().toLowerCase()
  const fullName = `${booking.firstname} ${booking.lastname || ''}`.trim().toLowerCase()

  const response = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
    q: booking.email.trim(),
  })

  const events = response.data.items || []
  const { startDateTimeLocal } = buildAppointmentDateTimes(
    booking.appointment_date,
    booking.appointment_time
  )

  for (const event of events) {
    const attendeeMatch = event.attendees?.some(
      (attendee) => attendee.email?.toLowerCase() === customerEmail
    )
    const summary = (event.summary || '').toLowerCase()
    const nameMatch =
      summary.includes(booking.firstname.toLowerCase()) ||
      (fullName.length > 2 && summary.includes(fullName))
    const start = event.start?.dateTime || event.start?.date
    const startMatch = start?.startsWith(startDateTimeLocal.slice(0, 16))

    if ((attendeeMatch || nameMatch) && (startMatch || attendeeMatch)) {
      return event.id || null
    }
  }

  return null
}

export async function updateCalendarEventTime(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  appointmentDate: string,
  appointmentTime: string
) {
  const { startDateTimeLocal, endDateTimeLocal } = buildAppointmentDateTimes(
    appointmentDate,
    appointmentTime
  )

  return calendar.events.patch({
    calendarId,
    eventId,
    sendUpdates: 'all',
    requestBody: {
      start: { dateTime: startDateTimeLocal, timeZone: BOOKING_TIMEZONE },
      end: { dateTime: endDateTimeLocal, timeZone: BOOKING_TIMEZONE },
    },
  })
}
