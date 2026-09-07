import { NextRequest, NextResponse } from 'next/server'
import { resolveFubBookingState } from '@/lib/fubEmbeddedApp'
import { fubApiFetch, getFubApiKey } from '@/lib/fubApi'
import { torontoDayStartIso } from '@/lib/bookingDateFilter'
import {
  buildFollowUpNoteBody,
  buildFollowUpTaskName,
  followUpDueDateTime,
  isFollowUpSlot,
  parseFollowUpStaff,
  type FollowUpSlot,
} from '@/lib/followUpTasks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function personIdFromContext(person: { id?: number | string } | undefined) {
  const raw = person?.id
  const id = typeof raw === 'number' ? raw : Number(String(raw || '').trim())
  return Number.isFinite(id) && id > 0 ? id : null
}

async function createFubTask(body: Record<string, unknown>) {
  return fubApiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) })
}

export async function POST(request: NextRequest) {
  try {
    if (!getFubApiKey()) {
      return NextResponse.json(
        { error: 'Add FUB_API_KEY in Vercel so follow-up tasks can be created.' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const personId = personIdFromContext(resolved.context.person)
    if (!personId) {
      return NextResponse.json({ error: 'Open a lead to create a follow-up.' }, { status: 400 })
    }

    const slot = body.slot
    if (!isFollowUpSlot(slot)) {
      return NextResponse.json({ error: 'Choose 12 PM, 4 PM, or 7 PM.' }, { status: 400 })
    }

    const date = String(body.date || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Choose a date.' }, { status: 400 })
    }

    const staff = parseFollowUpStaff(body.staff)
    const note = String(body.note || '').trim()
    const taskName = buildFollowUpTaskName(staff, slot as FollowUpSlot, note)
    const noteBody = buildFollowUpNoteBody(staff, slot as FollowUpSlot, note)
    const dueDateTime = followUpDueDateTime(date, slot as FollowUpSlot, torontoDayStartIso(date))
    const currentUser = String(resolved.context.user?.name || '').trim()

    const payload: Record<string, unknown> = {
      personId,
      name: taskName,
      type: 'Follow Up',
      dueDate: date,
      dueDateTime,
    }
    if (staff) payload.assignedTo = staff
    else if (currentUser) payload.assignedTo = currentUser

    let created = await createFubTask(payload)
    if (!created.ok && staff && currentUser && currentUser.toLowerCase() !== staff.toLowerCase()) {
      created = await createFubTask({ ...payload, assignedTo: currentUser })
    }
    if (!created.ok && payload.assignedTo) {
      const withoutAssignee = { ...payload }
      delete withoutAssignee.assignedTo
      created = await createFubTask(withoutAssignee)
    }

    if (!created.ok) {
      const details = created.json as { error?: string; message?: string }
      console.error('FUB follow-up task failed:', created.status, created.json)
      return NextResponse.json(
        { error: details.error || details.message || 'Could not create the follow-up task.' },
        { status: 500 }
      )
    }

    if (note) {
      await fubApiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({
          personId,
          subject: taskName,
          body: noteBody,
        }),
      })
    }

    return NextResponse.json({
      task: created.json,
      message: `Follow-up added${staff ? ` for ${staff}` : ''} at ${slot}.`,
    })
  } catch (error) {
    console.error('FUB follow-up task error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create the follow-up task.' },
      { status: 500 }
    )
  }
}
