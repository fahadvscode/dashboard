import { NextRequest, NextResponse } from 'next/server'
import { requireFubBooking } from '@/lib/fubBookingGuard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const gated = await requireFubBooking(request, body)
  if ('error' in gated && gated.error) return gated.error

  const response = await fetch(`${gated.origin}/api/bookings/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: gated.table,
      bookingId: gated.bookingId,
      sendSms: true,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  return NextResponse.json(payload, { status: response.status })
}
