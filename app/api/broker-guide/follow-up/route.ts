import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessBroker } from '@/lib/brokerGuideServer'
import { buildFollowUpReport } from '@/lib/followUpReport'
import { isReportDate } from '@/lib/constantContactReport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied

  const day = request.nextUrl.searchParams.get('date') || ''
  if (!isReportDate(day)) return NextResponse.json({ error: 'Choose a day.' }, { status: 400 })

  try {
    const report = await buildFollowUpReport(day)
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the follow-up report.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
