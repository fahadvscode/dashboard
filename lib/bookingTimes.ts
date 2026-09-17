import { FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE } from '@/lib/interviewBookingConstants'

export const BOOKING_TIMEZONE = 'America/Toronto'
export const OFFICE_ADDRESS = '600 Matheson Blvd W, Mississauga, ON L5R 4C1'

export const VALID_BOOKING_TABLES = [
  'fj_bookings',
  'precon_factory_bookings',
  'gta_lowrise_bookings',
  FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
] as const

export type BookingTable = (typeof VALID_BOOKING_TABLES)[number]

export function isValidBookingTable(table: string): table is BookingTable {
  return (VALID_BOOKING_TABLES as readonly string[]).includes(table)
}

export function getBrandFromTable(tableName: string): string {
  if (tableName === FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE) {
    return 'Fahad Javed Real Estate'
  }
  if (tableName.includes('gta_lowrise') || tableName.includes('gtalowrise')) {
    return 'GTA Lowrise'
  }
  if (tableName.includes('precon')) {
    return 'Precon Factory'
  }
  return 'Fahad Javed Real Estate'
}

export function getBrandContact(source: string) {
  if (source === 'Fahad Javed Real Estate') {
    return { email: 'fahad@fahadsold.com', phoneFormatted: '(647) 898-1739' }
  }
  if (source === 'Precon Factory') {
    return { email: 'info@preconfactory.com', phoneFormatted: '(647) 956-4063' }
  }
  return { email: 'gtalowrise01@gmail.com', phoneFormatted: '(416) 399-4289' }
}

export function parseAppointmentTime(appointmentTime: string): { hours: number; minutes: number } {
  let hours = 0
  let minutes = 0
  const timeMatch = appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)?/i)
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10)
    minutes = parseInt(timeMatch[2], 10)
    const period = timeMatch[3]?.toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
  }
  return { hours, minutes }
}

export function formatAppointmentTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/** Display stored booking times (e.g. "14:30") as a 12-hour clock. */
export function formatAppointmentTimeDisplay(appointmentTime: string | null | undefined): string {
  const raw = String(appointmentTime || '').trim()
  if (!raw) return ''
  if (!/\d/.test(raw)) return raw
  const { hours, minutes } = parseAppointmentTime(raw)
  return formatAppointmentTime(hours, minutes)
}

export function todayTorontoYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: BOOKING_TIMEZONE })
}

/** YYYY-MM-DD from a date column or ISO timestamp. */
export function bookingDateYmd(value: unknown): string | null {
  const match = String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

export function torontoDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minute: Number(get('minute')),
    second: Number(get('second')),
  }
}

/** True once Toronto's clock has reached the appointment time (no late SMS/email). */
export function appointmentHasStarted(
  appointmentDate: string,
  appointmentTime: string,
  now = new Date()
) {
  const ymd = bookingDateYmd(appointmentDate)
  if (!ymd || !/\d/.test(String(appointmentTime || ''))) return true
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  const nowParts = torontoDateTimeParts(now)
  if (nowParts.ymd > ymd) return true
  if (nowParts.ymd < ymd) return false
  return nowParts.hour * 60 + nowParts.minute >= hours * 60 + minutes
}

/** Convert a Toronto wall date+time (e.g. 2026-09-14, 2:00 PM) to a real UTC Date, including DST. */
export function torontoWallToDate(dateYmd: string, appointmentTime: string): Date | null {
  const date = bookingDateYmd(dateYmd)
  if (!date || !/\d/.test(String(appointmentTime || ''))) return null
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  const desiredUtc = Date.UTC(year, month - 1, day, hours, minutes, 0)
  let utc = Date.UTC(year, month - 1, day, hours + 4, minutes, 0)
  for (let i = 0; i < 4; i++) {
    const wall = torontoDateTimeParts(new Date(utc))
    const actualUtc = Date.UTC(
      Number(wall.ymd.slice(0, 4)),
      Number(wall.ymd.slice(5, 7)) - 1,
      Number(wall.ymd.slice(8, 10)),
      wall.hour,
      wall.minute,
      0
    )
    const diff = desiredUtc - actualUtc
    if (diff === 0) return new Date(utc)
    utc += diff
  }
  return new Date(utc)
}

export function buildAppointmentDateTimes(appointmentDate: string, appointmentTime: string) {
  const date = bookingDateYmd(appointmentDate) || String(appointmentDate || '').trim()
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  const startDateTimeLocal = `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

  const endMinutes = minutes + 30
  const adjustedEndHours = endMinutes >= 60 ? hours + 1 : hours
  const adjustedEndMinutes = endMinutes >= 60 ? endMinutes - 60 : endMinutes
  const endDateTimeLocal = `${date}T${String(adjustedEndHours).padStart(2, '0')}:${String(adjustedEndMinutes).padStart(2, '0')}:00`

  return { startDateTimeLocal, endDateTimeLocal }
}

export function generateAppointmentTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 8; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 23 && minute === 30) continue
      slots.push(formatAppointmentTime(hour, minute))
    }
  }
  return slots
}

export const APPOINTMENT_TIME_SLOTS = generateAppointmentTimeSlots()

export function normalizeAppointmentTime(appointmentTime: string): string {
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  if (hours === 0 && minutes === 0 && !appointmentTime.match(/\d/)) {
    return APPOINTMENT_TIME_SLOTS[0]
  }
  const formatted = formatAppointmentTime(hours, minutes)
  if (APPOINTMENT_TIME_SLOTS.includes(formatted)) {
    return formatted
  }
  return formatted
}

export function getReminderResetFields() {
  return {
    reminder_24h_sent: false,
    reminder_24h_sent_at: null,
    reminder_1h_sent: false,
    reminder_1h_sent_at: null,
    reminder_5m_sent: false,
    reminder_5m_sent_at: null,
    reminder_admin_1h_sent: false,
    reminder_admin_1h_sent_at: null,
    reminder_admin_15m_sent: false,
    reminder_admin_15m_sent_at: null,
  }
}

export function isBookingStatusCanceled(status: unknown): boolean {
  const normalized = String(status || '').trim().toLowerCase()
  return normalized === 'canceled' || normalized === 'cancelled'
}

export function bookingStatusBadgeClass(status: unknown): string {
  switch (String(status || '').trim().toLowerCase()) {
    case 'scheduled':
    case 'confirmed':
    case 'pending':
    case 'new':
      return 'bg-green-100 text-green-800'
    case 'completed':
      return 'bg-blue-100 text-blue-800'
    case 'rescheduled':
      return 'bg-amber-100 text-amber-800'
    case 'no_show':
      return 'bg-orange-100 text-orange-800'
    case 'cancelled':
    case 'canceled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function formatBookingStatusLabel(status: unknown): string {
  const raw = String(status || '').trim()
  if (!raw) return 'Unknown'
  switch (raw.toLowerCase()) {
    case 'no_show':
      return 'No show'
    case 'completed':
      return 'Appointment Done'
    case 'rescheduled':
      return 'Rescheduled'
    case 'canceled':
      return 'Cancelled'
    default:
      return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
}
