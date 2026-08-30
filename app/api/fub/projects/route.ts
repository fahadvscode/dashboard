import { NextRequest, NextResponse } from 'next/server'
import { resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { searchCanadaProjects } from '@/lib/fubProjects'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working') {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const projects = await searchCanadaProjects(String(body.q || ''))
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('FUB project search failed:', error)
    return NextResponse.json({ projects: [] })
  }
}
