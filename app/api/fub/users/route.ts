import { NextRequest, NextResponse } from 'next/server'
import { resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { getFubApiKey, listFubUsers } from '@/lib/fubApi'
import { FOLLOW_UP_ASSIGNEES, orderFollowUpAssignees } from '@/lib/followUpTasks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!getFubApiKey()) {
      return NextResponse.json(
        { error: 'Add FUB_API_KEY in Vercel so Follow Up Boss users can be loaded.', users: fallbackUsers() },
        { status: 500 }
      )
    }

    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working') {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const users = orderFollowUpAssignees(await listFubUsers())
    return NextResponse.json({
      users: users.length > 0 ? users : fallbackUsers(),
      currentUser: resolved.context?.user || null,
    })
  } catch (error) {
    console.error('FUB users error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not load Follow Up Boss users.',
        users: fallbackUsers(),
      },
      { status: 500 }
    )
  }
}

function fallbackUsers() {
  return FOLLOW_UP_ASSIGNEES.map((name, index) => ({ id: -(index + 1), name }))
}
