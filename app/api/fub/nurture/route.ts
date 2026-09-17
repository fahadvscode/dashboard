import { NextRequest, NextResponse } from 'next/server'
import { fubPersonName, resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { getFubApiKey } from '@/lib/fubApi'
import { requireFubBooking } from '@/lib/fubBookingGuard'
import {
  applyAppointmentNurture,
  isFubNurtureTable,
  listAppointmentNurtures,
  personIdFromFubPerson,
  type NurtureAction,
} from '@/lib/fubNurture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const ACTIONS = new Set<NurtureAction>(['appointment_done', 'no_show', 'rescheduled', 'stop', 'restart'])

export async function POST(request: NextRequest) {
  try {
    if (!getFubApiKey()) {
      return NextResponse.json(
        { error: 'Add FUB_API_KEY in Vercel so nurture tasks can be created.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const action = String(body.action || '').trim() as NurtureAction
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Choose Appointment Done, No show, Rescheduled, Stop, or Restart.' }, { status: 400 })
    }

    const gated = await requireFubBooking(request, body)
    if ('error' in gated) return gated.error
    if (!isFubNurtureTable(gated.table)) {
      return NextResponse.json({ error: 'Appointment nurture is only for property bookings.' }, { status: 400 })
    }

    const personId = personIdFromFubPerson(resolved.context.person)
    if (!personId) {
      return NextResponse.json({ error: 'Open a lead to start appointment nurture.' }, { status: 400 })
    }

    const result = await applyAppointmentNurture({
      action,
      table: gated.table,
      bookingId: gated.bookingId,
      personId,
      leadFirstName: String(body.firstName || '').trim() || fubPersonName(resolved.context.person).split(' ')[0] || '',
    })

    const nurtures = await listAppointmentNurtures(personId)
    return NextResponse.json({
      ...result,
      nurtures,
    })
  } catch (error) {
    console.error('FUB appointment nurture error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update appointment nurture.' },
      { status: 500 }
    )
  }
}
