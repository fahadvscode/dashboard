import type { SupabaseClient } from '@supabase/supabase-js'
import { isBookingStatusCanceled } from '@/lib/bookingTimes'

export const PUBLIC_BOOKING_LIMIT = 3
export const BOOKING_LIMIT_CONTACT = '+1 4163994289'
export const BOOKING_LIMIT_MESSAGE = 'Contact +1 4163994289 to book an appointment'
export const BOOKING_LIMIT_CODE = 'BOOKING_LIMIT'

export const PUBLIC_BOOKING_TABLES = [
  'fj_bookings',
  'precon_factory_bookings',
  'gta_lowrise_bookings',
] as const

export function lastTenPhoneDigits(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : ''
}

function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase()
}

export type BookingLimitResult = {
  count: number
  allowed: boolean
  limit: number
  code?: typeof BOOKING_LIMIT_CODE
  message?: string
}

export async function countPersonBookings(
  supabase: SupabaseClient,
  email: string,
  phone: string
): Promise<number> {
  const emailNorm = normalizeEmail(email)
  const phoneKey = lastTenPhoneDigits(phone)
  if (!emailNorm && phoneKey.length < 10) return 0

    const seen = new Set<string>()
  for (const table of PUBLIC_BOOKING_TABLES) {
    const batches: Array<{ id?: string; email?: string | null; phone?: string | null; status?: string | null }>[] = []
    if (emailNorm) {
      const { data, error } = await supabase
        .from(table)
        .select('id, email, phone, status')
        .ilike('email', emailNorm)
        .limit(200)
      if (error) console.error(`Booking limit email count failed for ${table}:`, error.message)
      else batches.push((data ?? []) as Array<{ id?: string; email?: string | null; phone?: string | null; status?: string | null }>)
    }
    if (phoneKey.length >= 10) {
      const { data, error } = await supabase
        .from(table)
        .select('id, email, phone, status')
        .ilike('phone', `%${phoneKey}%`)
        .limit(200)
      if (error) console.error(`Booking limit phone count failed for ${table}:`, error.message)
      else batches.push((data ?? []) as Array<{ id?: string; email?: string | null; phone?: string | null; status?: string | null }>)
    }
    for (const batch of batches) {
      for (const item of batch) {
        if (isBookingStatusCanceled(item.status)) continue
        const emailMatch = emailNorm && normalizeEmail(String(item.email || '')) === emailNorm
        const phoneMatch = phoneKey.length >= 10 && lastTenPhoneDigits(String(item.phone || '')) === phoneKey
        if (!emailMatch && !phoneMatch) continue
        seen.add(`${table}:${item.id}`)
      }
    }
  }
  return seen.size
}

export async function getPublicBookingLimit(
  supabase: SupabaseClient,
  email: string,
  phone: string
): Promise<BookingLimitResult> {
  const count = await countPersonBookings(supabase, email, phone)
  if (count >= PUBLIC_BOOKING_LIMIT) {
    return {
      count,
      allowed: false,
      limit: PUBLIC_BOOKING_LIMIT,
      code: BOOKING_LIMIT_CODE,
      message: BOOKING_LIMIT_MESSAGE,
    }
  }
  return { count, allowed: true, limit: PUBLIC_BOOKING_LIMIT }
}
