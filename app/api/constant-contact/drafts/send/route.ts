import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessBroker } from '@/lib/brokerGuideServer'
import { reportAccount } from '@/lib/constantContactReport'
import { launchSavedDraft } from '@/lib/constantContactSend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied

  const body = (await request.json().catch(() => null)) as {
    account?: string
    campaign?: string
    subject?: string
    listIds?: unknown
    mode?: string
    at?: string
  } | null
  const account = reportAccount(body?.account || '')
  if (!account) return NextResponse.json({ error: 'Choose an account.' }, { status: 400 })
  if (body?.mode !== 'now' && body?.mode !== 'schedule') {
    return NextResponse.json({ error: 'Choose send now or a schedule.' }, { status: 400 })
  }
  const listIds = Array.isArray(body.listIds) ? body.listIds.filter((id): id is string => typeof id === 'string') : []

  try {
    const result = await launchSavedDraft(account, {
      campaignId: body.campaign || '',
      subject: body.subject || '',
      listIds,
      mode: body.mode,
      at: body.at,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send this email.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
