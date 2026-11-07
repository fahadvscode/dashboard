import { NextRequest } from 'next/server'
import { rejectUnlessBroker } from '@/lib/brokerGuideServer'
import { buildAccountReport, isReportDate, reportAccount, torontoToday } from '@/lib/constantContactReport'
import type { AccountReport } from '@/lib/constantContactReportTypes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const NAMES = {
  primary: 'Fahad Javed Real Estate',
  second: 'Precon Factory',
  third: 'GTA Lowrise',
} as const

export async function GET(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied

  const account = reportAccount(request.nextUrl.searchParams.get('account') || '')
  const day = request.nextUrl.searchParams.get('date') || torontoToday()
  if (!account || !isReportDate(day)) {
    return new Response(JSON.stringify({ error: 'Choose an account and a day.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
      }
      let report: AccountReport
      try {
        report = await buildAccountReport(account, day, (progress) => {
          send({ type: 'progress', step: progress.step, message: progress.message })
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not read this account.'
        report = { id: account, name: NAMES[account], campaigns: [], error: message }
      }
      send({ type: 'report', report })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
