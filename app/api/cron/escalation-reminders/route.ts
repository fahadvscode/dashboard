import { NextRequest, NextResponse } from 'next/server'
import { sendDueEscalationReminders } from '@/lib/escalationNotify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const vercelCronHeader = request.headers.get('x-vercel-cron')
  const cronSecret = process.env.CRON_SECRET
  return !cronSecret || authHeader === `Bearer ${cronSecret}` || vercelCronHeader === '1'
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendDueEscalationReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Escalation reminder cron failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send escalation reminders.' },
      { status: 500 }
    )
  }
}
