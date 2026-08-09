/**
 * Re-send notifications for the latest fahad_sells_interview_bookings row
 * (e.g. after a failed trigger or before field-mapping fix was deployed).
 *
 *   DRY_RUN=1 npx tsx scripts/replay-fahad-sells-interview-notify.ts
 *   npx tsx scripts/replay-fahad-sells-interview-notify.ts
 */

import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const NOTIFY_URL =
  process.env.BOOKING_NOTIFY_URL ||
  'https://property-dashboard-three.vercel.app/api/bookings/notify'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const { normalizeBookingPayload } = await import('../lib/normalizeBookingPayload')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from('fahad_sells_interview_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const row = data?.[0]
  if (!row) {
    console.log('No interview bookings found.')
    return
  }

  const payload = {
    ...(row as Record<string, unknown>),
    table_name: 'fahad_sells_interview_bookings',
  }
  normalizeBookingPayload(payload)

  console.log('Latest booking id:', row.id)
  console.log('Normalized date/time:', payload.appointment_date, payload.appointment_time)
  console.log('POST', NOTIFY_URL)

  if (DRY_RUN) {
    console.log('DRY_RUN — not sending.')
    return
  }

  const res = await fetch(NOTIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  console.log('Status:', res.status)
  console.log(text)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
