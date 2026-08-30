import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { pickFubEmail, pickFubPhone, resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { bookingMatchesContact } from '@/lib/fubProjects'

export async function requireFubBooking(request: NextRequest, body: Record<string, unknown>) {
  const resolved = resolveFubBookingState(
    typeof body.context === 'string' ? body.context : '',
    typeof body.signature === 'string' ? body.signature : ''
  )
  if (resolved.status !== 'working' || !resolved.context?.person) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 401 }) }
  }

  const table = String(body.table || '')
  const bookingId = String(body.bookingId || '')
  if (!table || !bookingId) {
    return { error: NextResponse.json({ error: 'Booking is required.' }, { status: 400 }) }
  }

  const supabase = getSupabaseAdmin()
  const { data: booking } = await supabase.from(table).select('id, email, phone').eq('id', bookingId).maybeSingle()
  if (!booking) {
    return { error: NextResponse.json({ error: 'Booking not found.' }, { status: 404 }) }
  }

  const person = resolved.context.person
  if (!bookingMatchesContact(booking, pickFubEmail(person), pickFubPhone(person))) {
    return { error: NextResponse.json({ error: 'Not authorized.' }, { status: 401 }) }
  }

  return { table, bookingId, origin: request.nextUrl.origin }
}
