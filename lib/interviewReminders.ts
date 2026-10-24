import twilio from 'twilio'
import { getSupabaseAdmin } from '@/lib/supabase'
import { logOutboundSms } from '@/lib/logSmsConversation'
import {
  FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
  INTERVIEW_BRAND_NAME,
  INTERVIEW_OFFICE_ADDRESS,
  interviewPhrase,
} from '@/lib/interviewBookingConstants'
import { getInterviewManageLinkSms, resolveInterviewManageUrl } from '@/lib/interviewManageUrl'

const WINDOW_24H = { minHours: 20, maxHours: 25 }
const WINDOW_2H = { minHours: 1.5, maxHours: 2.5 }

type InterviewRow = {
  id: string
  full_name?: string | null
  phone?: string | null
  status?: string | null
  slot_start?: string | null
  position_label?: string | null
  position_id?: string | null
  manage_token?: string | null
}

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function interviewStart(slot: unknown): Date | null {
  const raw = String(slot || '').trim()
  if (!raw) return null
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
  const parsed = new Date(hasZone ? raw : `${raw}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function torontoParts(date: Date) {
  const day = date.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  const time = date.toLocaleTimeString('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return { day, time }
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'there'
}

function reminderBody(booking: InterviewRow, when: '24h' | '2h', day: string, time: string) {
  const name = firstName(String(booking.full_name || ''))
  const phrase = interviewPhrase(booking)
  const whenLine = when === '24h' ? `is tomorrow at ${time}` : `is in 2 hours, at ${time}`
  const manageUrl = resolveInterviewManageUrl(booking as unknown as Record<string, unknown>)
  return `Hi ${name}! Reminder — your ${phrase} ${whenLine} on ${day}.

Please arrive at:
${INTERVIEW_OFFICE_ADDRESS}${getInterviewManageLinkSms(manageUrl)}

- ${INTERVIEW_BRAND_NAME}`
}

function alreadySent(logs: Array<{ lead_id?: string | null; message_body?: string | null }>, bookingId: string, when: '24h' | '2h', day: string, time: string) {
  const marker = when === '24h' ? 'is tomorrow at' : 'is in 2 hours, at'
  return logs.some((row) => {
    const body = String(row.message_body || '')
    return row.lead_id === bookingId && body.includes(marker) && body.includes(day) && body.includes(time)
  })
}

export async function sendDueInterviewReminders(now = new Date()) {
  const results = { checked: 0, sent: 0, errors: 0, details: [] as Array<{ type: string; booking: string }> }
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromPhone = process.env.TWILIO_PHONE_NUMBER
  if (!accountSid || !authToken || !fromPhone) {
    console.error('Interview reminders skipped: Twilio is not configured.')
    return results
  }

  const supabase = getSupabaseAdmin()
  const until = new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
    .select('id, full_name, phone, status, slot_start, position_label, position_id, manage_token')
    .eq('status', 'scheduled')
    .gte('slot_start', now.toISOString())
    .lte('slot_start', until)

  if (error) {
    console.error('Interview reminder query failed:', error.message)
    results.errors++
    return results
  }

  const bookings = (data || []) as InterviewRow[]
  results.checked = bookings.length
  if (bookings.length === 0) return results

  const ids = bookings.map((booking) => booking.id)
  const { data: logs, error: logError } = await supabase
    .from('sms_conversations')
    .select('lead_id, message_body')
    .eq('lead_table', FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
    .in('lead_id', ids)

  if (logError) {
    console.error('Interview reminder history query failed:', logError.message)
    results.errors++
    return results
  }

  const client = twilio(accountSid, authToken)
  const history = logs || []

  for (const booking of bookings) {
    const phone = String(booking.phone || '').trim()
    const start = interviewStart(booking.slot_start)
    if (!phone || !start) continue
    const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntil <= 0) continue
    const { day, time } = torontoParts(start)

    const due: Array<'24h' | '2h'> = []
    if (hoursUntil <= WINDOW_24H.maxHours && hoursUntil > WINDOW_24H.minHours) due.push('24h')
    if (hoursUntil <= WINDOW_2H.maxHours && hoursUntil > WINDOW_2H.minHours) due.push('2h')

    for (const when of due) {
      if (alreadySent(history, booking.id, when, day, time)) continue
      const body = reminderBody(booking, when, day, time)
      const toPhone = toE164NorthAmerica(phone)
      try {
        const sent = await client.messages.create({ body, from: fromPhone, to: toPhone })
        await logOutboundSms({
          messageSid: sent.sid,
          fromPhone,
          toPhone,
          body,
          status: sent.status,
          leadName: String(booking.full_name || '').trim() || null,
          leadId: booking.id,
          leadTable: FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
        })
        history.push({ lead_id: booking.id, message_body: body })
        results.sent++
        results.details.push({ type: when === '24h' ? 'interview 24h' : 'interview 2h', booking: booking.id })
      } catch (sendError) {
        console.error(`Interview ${when} reminder failed for ${booking.id}:`, sendError)
        results.errors++
      }
    }
  }

  return results
}
