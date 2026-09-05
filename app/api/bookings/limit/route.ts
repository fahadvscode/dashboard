import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getPublicBookingLimit } from '@/lib/bookingLimit'

const ALLOWED_ORIGINS = new Set([
  'https://www.qikfill.com',
  'https://qikfill.com',
  'https://property-dashboard-three.vercel.app',
])

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.qikfill.com'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request)
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').trim()
    const phone = String(body.phone || '').trim()
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required.' }, { status: 400, headers })
    }
    const supabase = getSupabaseAdmin()
    const result = await getPublicBookingLimit(supabase, email, phone)
    return NextResponse.json(result, { headers })
  } catch (error) {
    console.error('Booking limit check failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not check booking limit.' },
      { status: 500, headers }
    )
  }
}
