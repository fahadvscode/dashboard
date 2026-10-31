import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  blockRangeLabel,
  closedSlotLabels,
  isBlockStillOpen,
  isBookingBlockBrand,
  minutesFromTime,
  timeFromMinutes,
  type BookingBlock,
} from '@/lib/bookingBlocks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_ORIGINS = new Set([
  'https://www.qikfill.com',
  'https://qikfill.com',
  'https://property-dashboard-three.vercel.app',
  'http://localhost:3000',
])

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://www.qikfill.com'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function canManage(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  if (!origin) return true
  return origin === 'https://property-dashboard-three.vercel.app' || origin.startsWith('http://localhost:')
}

function missingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message || ''
  return error?.code === '42P01' || /booking_blocks/i.test(message) && /does not exist|schema cache|could not find/i.test(message)
}

function asBlock(row: Record<string, unknown>): BookingBlock | null {
  const brand = String(row.brand || '')
  if (!isBookingBlockBrand(brand)) return null
  const date = String(row.block_date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return {
    id: String(row.id || ''),
    block_date: date,
    start_minutes: Number(row.start_minutes),
    end_minutes: Number(row.end_minutes),
    brand,
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request)
  try {
    const { searchParams } = new URL(request.url)
    const date = String(searchParams.get('date') || '').trim()
    const brand = String(searchParams.get('brand') || 'all').trim()
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('booking_blocks')
      .select('id, block_date, start_minutes, end_minutes, brand')
      .order('block_date', { ascending: true })
      .order('start_minutes', { ascending: true })
    if (error) {
      if (missingTable(error)) {
        return NextResponse.json({ ready: false, blocks: [], closed: [] }, { headers: { ...headers, 'Cache-Control': 'no-store' } })
      }
      throw error
    }
    const blocks = (data || []).map((row) => asBlock(row as Record<string, unknown>)).filter((row): row is BookingBlock => !!row)
    const open = blocks.filter((block) => isBlockStillOpen(block))
    const closed = /^\d{4}-\d{2}-\d{2}$/.test(date) && isBookingBlockBrand(brand === 'all' ? 'all' : brand)
      ? closedSlotLabels(open, date, brand)
      : []
    return NextResponse.json({
      ready: true,
      blocks: open.map((block) => ({
        id: block.id,
        date: block.block_date,
        brand: block.brand,
        start: timeFromMinutes(block.start_minutes),
        end: timeFromMinutes(block.end_minutes),
        label: blockRangeLabel(block),
      })),
      closed,
    }, { headers: { ...headers, 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Closed times lookup failed:', error)
    return NextResponse.json({ ready: false, blocks: [], closed: [] }, { headers: { ...headers, 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request)
  if (!canManage(request)) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403, headers })
  }
  try {
    const body = await request.json()
    const date = String(body.date || '').trim()
    const brand = String(body.brand || 'all').trim()
    const start = minutesFromTime(String(body.start || ''))
    const end = minutesFromTime(String(body.end || ''))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isBookingBlockBrand(brand) || start == null || end == null || end <= start) {
      return NextResponse.json({ error: 'Choose a date, a brand, and an end time after the start.' }, { status: 400, headers })
    }
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('booking_blocks')
      .insert({ block_date: date, start_minutes: start, end_minutes: end, brand })
      .select('id')
      .single()
    if (error) {
      if (missingTable(error)) {
        return NextResponse.json({ error: 'Closed times are not turned on in the database yet.' }, { status: 503, headers })
      }
      throw error
    }
    return NextResponse.json({ id: data?.id }, { headers })
  } catch (error) {
    console.error('Closed time save failed:', error)
    return NextResponse.json({ error: 'Could not save this closed time.' }, { status: 500, headers })
  }
}

export async function DELETE(request: NextRequest) {
  const headers = corsHeaders(request)
  if (!canManage(request)) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403, headers })
  }
  try {
    const body = await request.json()
    const id = String(body.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Missing closed time.' }, { status: 400, headers })
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('booking_blocks').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true }, { headers })
  } catch (error) {
    console.error('Closed time delete failed:', error)
    return NextResponse.json({ error: 'Could not remove this closed time.' }, { status: 500, headers })
  }
}
