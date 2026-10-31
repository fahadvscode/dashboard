import { APPOINTMENT_TIME_SLOTS, BOOKING_TIMEZONE, formatAppointmentTime, parseAppointmentTime } from '@/lib/bookingTimes'

export const BOOKING_BLOCK_BRANDS = ['all', 'fj', 'precon', 'gta'] as const
export type BookingBlockBrand = (typeof BOOKING_BLOCK_BRANDS)[number]

export type BookingBlock = {
  id: string
  block_date: string
  start_minutes: number
  end_minutes: number
  brand: BookingBlockBrand
}

export function isBookingBlockBrand(value: string): value is BookingBlockBrand {
  return (BOOKING_BLOCK_BRANDS as readonly string[]).includes(value)
}

export function minutesFromTime(value: string): number | null {
  const raw = String(value || '').trim()
  if (!raw || !/\d/.test(raw)) return null
  const { hours, minutes } = parseAppointmentTime(raw)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  if (hours === 0 && minutes === 0 && !/[1-9]/.test(raw) && !/12/.test(raw)) return null
  return hours * 60 + minutes
}

export function timeFromMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return formatAppointmentTime(hours, mins)
}

export function torontoNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || ''
  const hour = Number(pick('hour'))
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    minutes: (hour === 24 ? 0 : hour) * 60 + Number(pick('minute') || 0),
  }
}

export function isBlockStillOpen(block: Pick<BookingBlock, 'block_date' | 'end_minutes'>, now = new Date()) {
  const current = torontoNowParts(now)
  if (block.block_date > current.date) return true
  if (block.block_date < current.date) return false
  return current.minutes < block.end_minutes
}

export function blockAppliesToBrand(blockBrand: BookingBlockBrand, brand: string) {
  return blockBrand === 'all' || blockBrand === brand
}

export function closedSlotLabels(
  blocks: BookingBlock[],
  date: string,
  brand: string,
  now = new Date()
) {
  const active = blocks.filter(
    (block) =>
      block.block_date === date &&
      blockAppliesToBrand(block.brand, brand) &&
      isBlockStillOpen(block, now)
  )
  return APPOINTMENT_TIME_SLOTS.filter((slot) => {
    const minutes = minutesFromTime(slot)
    if (minutes == null) return false
    return active.some((block) => minutes >= block.start_minutes && minutes < block.end_minutes)
  })
}

export function blockRangeLabel(block: Pick<BookingBlock, 'start_minutes' | 'end_minutes'>) {
  return `${timeFromMinutes(block.start_minutes)}–${timeFromMinutes(block.end_minutes)}`
}
