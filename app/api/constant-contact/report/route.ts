import { NextRequest, NextResponse } from 'next/server'
import { buildAccountReport, isReportDate, reportAccount, torontoToday } from '@/lib/constantContactReport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const account = reportAccount(request.nextUrl.searchParams.get('account') || '')
  const day = request.nextUrl.searchParams.get('date') || torontoToday()
  if (!account || !isReportDate(day)) {
    return NextResponse.json({ error: 'Choose an account and a day.' }, { status: 400 })
  }
  const report = await buildAccountReport(account, day)
  return NextResponse.json(report)
}
