import { NextRequest, NextResponse } from 'next/server'
import { rejectUnlessBroker } from '@/lib/brokerGuideServer'
import { isCampaignId, reportAccount } from '@/lib/constantContactReport'
import { listSavedDrafts, readSavedDraft } from '@/lib/constantContactSend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied

  const account = reportAccount(request.nextUrl.searchParams.get('account') || '')
  if (!account) return NextResponse.json({ error: 'Choose an account.' }, { status: 400 })

  const campaign = request.nextUrl.searchParams.get('campaign') || ''
  try {
    if (campaign) {
      if (!isCampaignId(campaign)) return NextResponse.json({ error: 'Choose a draft.' }, { status: 400 })
      const draft = await readSavedDraft(account, campaign)
      return NextResponse.json(draft, { headers: { 'Cache-Control': 'no-store' } })
    }
    const result = await listSavedDrafts(account)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the saved drafts.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
