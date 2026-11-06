import { NextRequest, NextResponse } from 'next/server'
import { getCampaignDesign, isCampaignId, reportAccount } from '@/lib/constantContactReport'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const account = reportAccount(request.nextUrl.searchParams.get('account') || '')
  const campaign = request.nextUrl.searchParams.get('campaign') || ''
  if (!account || !isCampaignId(campaign)) {
    return NextResponse.json({ error: 'Choose an email.' }, { status: 400 })
  }
  try {
    const design = await getCampaignDesign(account, campaign)
    return NextResponse.json(design)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not open this email.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
