import { NextRequest, NextResponse } from 'next/server'
import { brokerCodeMatches } from '@/lib/brokerGuide'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null
  if (!brokerCodeMatches(body?.code)) {
    return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
