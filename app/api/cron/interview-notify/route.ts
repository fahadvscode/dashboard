import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE } from '@/lib/interviewBookingConstants'
import { interviewAlreadyNotified } from '@/lib/markInterviewNotified'

export const maxDuration = 60

const LOOKBACK_HOURS = 12
const TRIGGER_GRACE_MS = 90_000

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const vercelCronHeader = request.headers.get('x-vercel-cron')
  const cronSecret = process.env.CRON_SECRET
  return !cronSecret || authHeader === `Bearer ${cronSecret}` || vercelCronHeader === '1'
}

async function catchUpInterviewNotifications() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
  const waitUntil = new Date(Date.now() - TRIGGER_GRACE_MS).toISOString()

  const { data, error } = await supabase
    .from(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
    .select('*')
    .eq('status', 'scheduled')
    .gte('created_at', since)
    .lte('created_at', waitUntil)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pending = (data || []).filter(row => !interviewAlreadyNotified(row.last_sync_source))
  if (pending.length === 0) {
    return NextResponse.json({ success: true, checked: data?.length || 0, sent: 0 })
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://property-dashboard-three.vercel.app'

  const results: Array<{ id: string; status: number; skipped?: boolean; error?: string }> = []

  for (const row of pending) {
    try {
      const res = await fetch(`${baseUrl}/api/bookings/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...row,
          table_name: FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE,
        }),
      })
      const json = await res.json().catch(() => ({}))
      results.push({
        id: row.id,
        status: res.status,
        skipped: json?.skipped === true,
        error: json?.error,
      })
    } catch (err) {
      results.push({
        id: row.id,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  console.log('Interview notify catch-up:', {
    checked: data?.length || 0,
    pending: pending.length,
    results,
  })

  return NextResponse.json({
    success: true,
    checked: data?.length || 0,
    pending: pending.length,
    results,
  })
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return catchUpInterviewNotifications()
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return catchUpInterviewNotifications()
}
