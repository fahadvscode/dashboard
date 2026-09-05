import { BOOKING_TIMEZONE, parseAppointmentTime } from '@/lib/bookingTimes'
import { isFahadSellsInterviewBooking } from '@/lib/interviewBookingConstants'

export type BookingDateFilter = 'all' | 'today' | 'last7' | 'custom'
export type BookingScheduleColumn = 'appointment_date' | 'slot_start'

export const BOOKING_DATE_FILTERS: { key: BookingDateFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'custom', label: 'Custom' },
]

export type BookingDateRange = { from?: string; to?: string }

export function torontoYmd(offsetDays = 0) {
  const base = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  const date = new Date(`${base}T12:00:00`)
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getBookingDateRange(
  filter: BookingDateFilter,
  customFrom: string,
  customTo: string
): BookingDateRange {
  const today = torontoYmd()
  if (filter === 'all') return { from: today }
  if (filter === 'today') return { from: today, to: today }
  if (filter === 'last7') return { from: torontoYmd(-6), to: today }

  let from = customFrom || today
  let to = customTo || customFrom || today
  if (from > to) {
    const swapped = from
    from = to
    to = swapped
  }
  return { from, to }
}

function addDaysToYmd(ymd: string, days: number) {
  const date = new Date(`${ymd}T12:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function torontoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  }
}

/** UTC ISO for local midnight (America/Toronto) on a YYYY-MM-DD date. */
export function torontoDayStartIso(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  const searchStart = Date.UTC(year, month - 1, day, 0, 0, 0) - 6 * 60 * 60 * 1000
  const searchEnd = Date.UTC(year, month - 1, day, 12, 0, 0)
  for (let ms = searchStart; ms <= searchEnd; ms += 60 * 1000) {
    const candidate = new Date(ms)
    const local = torontoDateParts(candidate)
    if (local.ymd === ymd && local.hour === 0 && local.minute === 0 && local.second === 0) {
      return candidate.toISOString()
    }
  }
  return new Date(`${ymd}T04:00:00.000Z`).toISOString()
}

export function torontoNextDayStartIso(ymd: string) {
  return torontoDayStartIso(addDaysToYmd(ymd, 1))
}

type FilterableQuery = {
  eq: (column: string, value: string) => unknown
  gte: (column: string, value: string) => {
    lte: (column: string, value: string) => unknown
    lt: (column: string, value: string) => unknown
  }
  lte: (column: string, value: string) => unknown
  lt: (column: string, value: string) => unknown
}

export function applyAppointmentDateFilter<T>(query: T, range: BookingDateRange): T {
  const q = query as unknown as FilterableQuery
  if (range.from && range.to && range.from === range.to) {
    return q.eq('appointment_date', range.from) as T
  }
  if (range.from && range.to) {
    return q.gte('appointment_date', range.from).lte('appointment_date', range.to) as T
  }
  if (range.from) return q.gte('appointment_date', range.from) as T
  if (range.to) return q.lte('appointment_date', range.to) as T
  return query
}

/** Interview bookings store the slot as timestamptz, not appointment_date. */
export function applySlotStartDateFilter<T>(query: T, range: BookingDateRange): T {
  const q = query as unknown as FilterableQuery
  if (range.from && range.to) {
    return q.gte('slot_start', torontoDayStartIso(range.from)).lt('slot_start', torontoNextDayStartIso(range.to)) as T
  }
  if (range.from) return q.gte('slot_start', torontoDayStartIso(range.from)) as T
  if (range.to) return q.lt('slot_start', torontoNextDayStartIso(range.to)) as T
  return query
}

export function bookingScheduleColumn(tableName: string): BookingScheduleColumn {
  return isFahadSellsInterviewBooking(tableName) ? 'slot_start' : 'appointment_date'
}

export function applyBookingScheduleFilter<T>(query: T, range: BookingDateRange, tableName: string): T {
  return bookingScheduleColumn(tableName) === 'slot_start'
    ? applySlotStartDateFilter(query, range)
    : applyAppointmentDateFilter(query, range)
}

export function bookingDateFilterIsDateDesc(filter: BookingDateFilter) {
  return filter === 'last7'
}

export function bookingMatchesDateRange(
  appointmentDate: string | null | undefined,
  range: BookingDateRange
) {
  if (!range.from && !range.to) return true
  const date = String(appointmentDate || '').trim()
  if (!date) return false
  if (range.from && date < range.from) return false
  if (range.to && date > range.to) return false
  return true
}

export function bookingDateFilterCountLabel(
  filter: BookingDateFilter,
  count: number,
  options?: { allMeansEvery?: boolean }
) {
  if (filter === 'all') {
    return options?.allMeansEvery
      ? `${count} booking${count === 1 ? '' : 's'}`
      : `${count} upcoming`
  }
  if (filter === 'today') return `${count} today`
  if (filter === 'last7') return `${count} in the last 7 days`
  return `${count} in this range`
}

export function bookingDateFilterEmptyCopy(
  filter: BookingDateFilter,
  options?: { allMeansEvery?: boolean }
) {
  if (filter === 'all') {
    return options?.allMeansEvery ? 'No bookings.' : 'No upcoming appointments.'
  }
  if (filter === 'today') return 'No appointments today.'
  if (filter === 'last7') return 'No appointments in the last 7 days.'
  return 'No appointments in this date range.'
}

export function formatBookingDay(dateStr: string) {
  if (!dateStr || dateStr === 'Undated') return 'Undated'
  if (dateStr === torontoYmd()) return 'Today'
  if (dateStr === torontoYmd(1)) return 'Tomorrow'
  if (dateStr === torontoYmd(-1)) return 'Yesterday'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function sortBookingsByAppointment<T extends { appointment_date?: string | null; appointment_time?: string | null }>(
  list: T[],
  dateDesc = false
) {
  return [...list].sort((a, b) => {
    const dateCmp = dateDesc
      ? String(b.appointment_date || '').localeCompare(String(a.appointment_date || ''))
      : String(a.appointment_date || '').localeCompare(String(b.appointment_date || ''))
    if (dateCmp !== 0) return dateCmp
    const aTime = parseAppointmentTime(a.appointment_time || '')
    const bTime = parseAppointmentTime(b.appointment_time || '')
    return aTime.hours * 60 + aTime.minutes - (bTime.hours * 60 + bTime.minutes)
  })
}

export function groupBookingsByDate<T extends { appointment_date?: string | null }>(list: T[]) {
  const groups: { date: string; items: T[] }[] = []
  const byDate = new Map<string, T[]>()
  for (const item of list) {
    const key = item.appointment_date || 'Undated'
    const items = byDate.get(key) || []
    items.push(item)
    byDate.set(key, items)
  }
  for (const [date, items] of byDate) {
    groups.push({ date, items })
  }
  return groups
}
