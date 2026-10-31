import { getSupabaseAdmin } from '@/lib/supabase'
import {
  closedSlotLabels,
  isBlockStillOpen,
  isBookingBlockBrand,
  type BookingBlock,
} from '@/lib/bookingBlocks'

export function brandIdForBookingTable(table: string) {
  if (table === 'fj_bookings') return 'fj'
  if (table === 'precon_factory_bookings') return 'precon'
  if (table === 'gta_lowrise_bookings') return 'gta'
  return ''
}

export async function closedTimesFor(brand: string, date: string) {
  if (!isBookingBlockBrand(brand) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('booking_blocks')
    .select('id, block_date, start_minutes, end_minutes, brand')
  if (error || !data) return []
  const blocks = data.flatMap((row) => {
    const item = row as Record<string, unknown>
    const rowBrand = String(item.brand || '')
    const blockDate = String(item.block_date || '').slice(0, 10)
    if (!isBookingBlockBrand(rowBrand) || !/^\d{4}-\d{2}-\d{2}$/.test(blockDate)) return []
    const block: BookingBlock = {
      id: String(item.id || ''),
      block_date: blockDate,
      start_minutes: Number(item.start_minutes),
      end_minutes: Number(item.end_minutes),
      brand: rowBrand,
    }
    return isBlockStillOpen(block) ? [block] : []
  })
  return closedSlotLabels(blocks, date, brand)
}
