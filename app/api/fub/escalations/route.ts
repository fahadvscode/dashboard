import { NextRequest, NextResponse } from 'next/server'
import { createEscalationCalendarEvent } from '@/lib/bookingCalendar'
import {
  ESCALATION_CALENDAR_ATTENDEE,
  customEscalationNeedsReminder,
  escalationDueAt,
  escalationDueFromCustom,
  formatTorontoWall,
  isEscalationCustomWhen,
  parseEscalationFrom,
  parseEscalationStaff,
  parseEscalationWhen,
} from '@/lib/escalations'
import { notifyEscalationCreated, saveEscalationReminder } from '@/lib/escalationNotify'
import {
  fubPersonName,
  pickFubEmail,
  pickFubPhone,
  resolveFubBookingState,
} from '@/lib/fubEmbeddedApp'
import { addFubPersonTags, getFubApiKey } from '@/lib/fubApi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const from = parseEscalationFrom(body.from)
    if (!from) {
      return NextResponse.json({ error: 'Choose who this is from.' }, { status: 400 })
    }

    const staff = parseEscalationStaff(body.staff)
    if (!staff) {
      return NextResponse.json({ error: 'Choose who to escalate to.' }, { status: 400 })
    }

    const custom = isEscalationCustomWhen(body.when)
    const when = custom ? null : parseEscalationWhen(body.when)
    if (!custom && !when) {
      return NextResponse.json({ error: 'Choose 5 minutes, 15 minutes, 1 hour, 3 hours, or a custom time.' }, { status: 400 })
    }

    const dueAt = custom
      ? escalationDueFromCustom(String(body.date || ''), String(body.time || ''))
      : escalationDueAt(when!)
    if (!dueAt || Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: 'Choose a date and time.' }, { status: 400 })
    }
    if (dueAt.getTime() < Date.now() - 30 * 1000) {
      return NextResponse.json({ error: 'Choose a time in the future.' }, { status: 400 })
    }

    const reminderSms = custom ? customEscalationNeedsReminder(dueAt) : Boolean(when?.reminderSms)
    const wall = formatTorontoWall(dueAt)
    const endWall = formatTorontoWall(new Date(dueAt.getTime() + 15 * 60 * 1000))
    const whenLabel = custom ? `on ${wall.date} at ${wall.time}` : `${when!.label.toLowerCase()} (${wall.time})`

    const person = resolved.context.person
    const leadName = fubPersonName(person) || 'Lead'
    const email = pickFubEmail(person)
    const phone = pickFubPhone(person)
    const personId = person.id != null ? String(person.id) : ''
    const notice = {
      staff,
      from,
      leadName,
      email,
      phone,
      date: wall.date,
      time: wall.time,
    }

    let eventId: string | undefined
    try {
      const event = await createEscalationCalendarEvent({
        leadName,
        staff,
        from,
        date: wall.date,
        time: wall.time,
        startDateTimeLocal: wall.startDateTimeLocal,
        endDateTimeLocal: endWall.startDateTimeLocal,
        reminderMinutes: reminderSms ? 2 : 0,
        email,
        phone,
        personId,
      })
      eventId = event?.id || undefined
    } catch (calendarError) {
      console.error('FUB escalation calendar failed:', calendarError)
    }

    try {
      await notifyEscalationCreated(notice)
    } catch (notifyError) {
      console.error('FUB escalation staff notify failed:', notifyError)
    }

    if (reminderSms) {
      try {
        await saveEscalationReminder({ ...notice, dueAt, personId })
      } catch (reminderError) {
        console.error('FUB escalation reminder save failed:', reminderError)
      }
    }

    if (personId && getFubApiKey()) {
      try {
        const tagged = await addFubPersonTags(personId, ['Escalation'])
        if (!tagged.ok) {
          console.error('FUB escalation tag failed:', tagged.status, tagged.json)
        }
      } catch (tagError) {
        console.error('FUB escalation tag failed:', tagError)
      }
    }

    return NextResponse.json({
      eventId,
      message: `${staff} has to call ${leadName} ${whenLabel} (from ${from}). Invited ${ESCALATION_CALENDAR_ATTENDEE} — the lead was not contacted.`,
    })
  } catch (error) {
    console.error('FUB escalation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create the escalation.' },
      { status: 500 }
    )
  }
}
