import { createClient } from '@supabase/supabase-js'
import { FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE } from '@/lib/interviewBookingConstants'

const NOTIFIED_SOURCES = new Set(['notify', 'cron_notify'])

export function interviewAlreadyNotified(syncSource: unknown): boolean {
  return NOTIFIED_SOURCES.has(String(syncSource || ''))
}

export async function markInterviewNotified(
  bookingId: unknown,
  source: 'notify' | 'cron_notify' = 'notify'
): Promise<void> {
  if (typeof bookingId !== 'string' || !bookingId.trim()) return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase
    .from(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
    .update({ last_sync_source: source })
    .eq('id', bookingId)

  if (error) {
    console.error('Could not mark interview booking notified:', error.message)
  }
}
