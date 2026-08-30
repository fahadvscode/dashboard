import { NextRequest } from 'next/server'
import { POST as rescheduleDashboardBooking } from '@/app/api/bookings/reschedule/route'
import { requireFubBooking } from '@/lib/fubBookingGuard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const gated = await requireFubBooking(request, body)
  if ('error' in gated) return gated.error

  const inner = new NextRequest(new URL('/api/bookings/reschedule', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table: gated.table,
      bookingId: gated.bookingId,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time,
      appointment_type: body.appointment_type,
      sendSms: true,
    }),
  })
  return rescheduleDashboardBooking(inner)
}
