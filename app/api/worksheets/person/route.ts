import { NextRequest, NextResponse } from 'next/server'
import { findPeopleByClientId } from '@/lib/worksheetPerson'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const clientId = String(body.clientId || '').trim()
    if (!clientId) {
      return NextResponse.json({ error: 'Enter a Client ID.' }, { status: 400 })
    }
    const people = await findPeopleByClientId(clientId)
    if (people.length === 0) {
      return NextResponse.json({ error: 'No Follow Up Boss contact has that Client ID.' }, { status: 404 })
    }
    return NextResponse.json({ people })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not look up that Client ID.'
    const status = /not set/i.test(message) ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
