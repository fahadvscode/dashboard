import { NextRequest } from 'next/server'
import { POST as cancelDashboardBooking } from '@/app/api/bookings/cancel/route'
import { requireFubBooking } from '@/lib/fubBookingGuard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const gated = await requireFubBooking(request, body)
  if ('error' in gated) return gated.error

  const inner = new NextRequest(new URL('/api/bookings/cancel', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: gated.table,
      bookingId: gated.bookingId,
      sendSms: true,
    }),
  })
  return cancelDashboardBooking(inner)
}
