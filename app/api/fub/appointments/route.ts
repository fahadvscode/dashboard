import { NextRequest, NextResponse } from 'next/server'
import { pickFubEmail, pickFubPhone, resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { listUpcomingFubAppointments } from '@/lib/fubProjects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const person = resolved.context.person
    const appointments = await listUpcomingFubAppointments(pickFubEmail(person), pickFubPhone(person))
    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('FUB appointments list failed:', error)
    return NextResponse.json({ appointments: [] })
  }
}
