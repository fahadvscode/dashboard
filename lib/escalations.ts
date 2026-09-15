import { BOOKED_BY_OPTIONS } from '@/lib/bookedBy'
import { BOOKING_TIMEZONE, formatAppointmentTime, parseAppointmentTime } from '@/lib/bookingTimes'

export const ESCALATION_FROM_STAFF = BOOKED_BY_OPTIONS
export type EscalationFromStaff = (typeof ESCALATION_FROM_STAFF)[number]

export const ESCALATION_TO_STAFF = ['Fahad', 'Gigi', 'Jay'] as const
export type EscalationStaff = (typeof ESCALATION_TO_STAFF)[number]

export const ESCALATION_STAFF = ESCALATION_FROM_STAFF

/** Invite this mailbox onto the event. The Qikfill token cannot write to this calendar directly. */
export const ESCALATION_CALENDAR_ATTENDEE = 'info@fahadsold.com'

export const ESCALATION_WHEN = [
  { id: '5m', label: 'In 5 minutes', minutes: 5, reminderSms: false },
  { id: '15m', label: 'In 15 minutes', minutes: 15, reminderSms: true },
  { id: '1h', label: 'In 1 hour', minutes: 60, reminderSms: true },
  { id: '3h', label: 'In 3 hours', minutes: 180, reminderSms: true },
] as const

export const ESCALATION_CUSTOM_WHEN_ID = 'custom' as const

export type EscalationWhenId = (typeof ESCALATION_WHEN)[number]['id'] | typeof ESCALATION_CUSTOM_WHEN_ID
export type EscalationWhen = (typeof ESCALATION_WHEN)[number]

export function parseEscalationFrom(value: unknown): EscalationFromStaff | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return ESCALATION_FROM_STAFF.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

export function parseEscalationStaff(value: unknown): EscalationStaff | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return ESCALATION_TO_STAFF.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

export function parseEscalationWhen(value: unknown): EscalationWhen | null {
  const raw = String(value || '').trim()
  return ESCALATION_WHEN.find((item) => item.id === raw) || null
}

export function isEscalationCustomWhen(value: unknown) {
  return String(value || '').trim() === ESCALATION_CUSTOM_WHEN_ID
}

export function escalationDueAt(when: EscalationWhen, from = new Date()) {
  return new Date(from.getTime() + when.minutes * 60 * 1000)
}

export function escalationDueFromCustom(dateYmd: string, time: string): Date | null {
  const date = String(dateYmd || '').trim()
  const rawTime = String(time || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/\d/.test(rawTime)) return null
  const { hours, minutes } = parseAppointmentTime(rawTime)
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  const desiredUtc = Date.UTC(year, month - 1, day, hours, minutes, 0)
  const guess = new Date(desiredUtc)
  const wall = formatTorontoWall(guess)
  const [wallHour, wallMinute] = wall.startDateTimeLocal.slice(11, 16).split(':').map(Number)
  const [wallYear, wallMonth, wallDay] = wall.date.split('-').map(Number)
  const actualUtc = Date.UTC(wallYear, wallMonth - 1, wallDay, wallHour, wallMinute, 0)
  return new Date(guess.getTime() + (desiredUtc - actualUtc))
}

export function customEscalationNeedsReminder(dueAt: Date, from = new Date()) {
  return dueAt.getTime() - from.getTime() >= 7 * 60 * 1000
}

export function formatTorontoWall(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0
  const minute = Number(get('minute'))
  const dateYmd = `${year}-${month}-${day}`
  const startDateTimeLocal = `${dateYmd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  return {
    date: dateYmd,
    time: formatAppointmentTime(hour, minute),
    startDateTimeLocal,
  }
}

export function whoHasToCallLine(staff: string) {
  return `${staff} has to call the lead.`
}

export function buildEscalationSummary(staff: string, leadName: string, from?: string) {
  const who = leadName.trim() || 'Lead'
  const fromName = from?.trim()
  const base = `Escalation: ${staff} has to call ${who}`
  return fromName ? `${base} (from ${fromName})` : base
}

export function buildEscalationDescription(input: {
  staff: string
  from?: string
  leadName: string
  email: string
  phone: string
}) {
  const phone = input.phone.trim() || 'Not on file'
  const email = input.email.trim() || 'Not on file'
  const from = input.from?.trim()
  return [
    whoHasToCallLine(input.staff),
    '',
    'INTERNAL ESCALATION — the lead was not notified.',
    '',
    from ? `From: ${from}` : null,
    `Call: ${input.staff}`,
    `Lead: ${input.leadName.trim() || 'Lead'}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
  ]
    .filter((line) => line != null)
    .join('\n')
}

export function buildEscalationAdminSms(input: {
  staff: string
  from?: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const phone = input.phone.trim() || 'No phone'
  const email = input.email.trim() || 'No email'
  const from = input.from?.trim()
  return `🔔 Escalation

📞 ${whoHasToCallLine(input.staff)}${from ? `\n👤 From: ${from}` : ''}
👤 ${input.leadName.trim() || 'Lead'}
📱 ${phone}
📧 ${email}
📅 ${input.date}
🕐 ${input.time}

The lead was not contacted.`
}

export function buildEscalationAdminEmailHtml(input: {
  staff: string
  from?: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const lead = input.leadName.trim() || 'Lead'
  const phone = input.phone.trim() || 'Not on file'
  const email = input.email.trim() || 'Not on file'
  const from = input.from?.trim()
  const tel = input.phone.trim() ? `tel:${input.phone.trim()}` : ''
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
  <h2>Escalation</h2>
  <p style="background:#fef3c7;padding:12px 14px;border-left:4px solid #f59e0b;border-radius:6px">
    <strong>${whoHasToCallLine(input.staff)}</strong>
  </p>
  <p>${from ? `From: ${from}<br>` : ''}
  Lead: ${lead}<br>
  Email: ${email}<br>
  Phone: ${tel ? `<a href="${tel}">${phone}</a>` : phone}<br>
  Date: ${input.date}<br>
  Time: ${input.time}</p>
  <p>The lead was not emailed or texted.</p>
</body></html>`
}
