import { FOLLOW_UP_ASSIGNEES, followUpDueDateTime, type FollowUpSlot } from '@/lib/followUpTasks'
import { torontoDayStartIso, torontoYmd } from '@/lib/bookingDateFilter'

/** Internal FUB user who owns every appointment-nurture task. Exact FUB name. */
export const NURTURE_ASSIGNEE = FOLLOW_UP_ASSIGNEES[1]

export const NURTURE_TOUCH_COUNT = 14

export type NurtureTrack = 'appointment_done' | 'no_show'
export type NurtureOutcome = NurtureTrack | 'rescheduled'
export type NurtureStatus = 'active' | 'stopped' | 'pending'

export type NurtureChannel = 'Email' | 'Call' | 'Text' | 'Visit'

export type NurtureTouch = {
  n: number
  dayOffset: number
  slot: FollowUpSlot | 'now'
  channel: NurtureChannel
  title: string
  purpose: string
  script: string
}

export type NurtureTaskRecord = {
  touch: number
  fubTaskId: number | null
  dueDate: string
  name: string
  error?: string
}

export type AppointmentNurtureRow = {
  id: string
  booking_id: string
  booking_table: string
  fub_person_id: number
  outcome: NurtureOutcome
  status: NurtureStatus
  assigned_to: string
  tasks: NurtureTaskRecord[]
  started_at: string | null
  stopped_at: string | null
  created_at?: string
  updated_at?: string
}

function addDaysToYmd(ymd: string, days: number) {
  const date = new Date(`${ymd}T12:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fillName(template: string, firstName: string) {
  const name = firstName.trim() || 'there'
  return template.replace(/\[Name\]/g, name)
}

const DONE_TOUCHES: Omit<NurtureTouch, 'script'>[] = [
  { n: 1, dayOffset: 0, slot: 'now', channel: 'Email', title: 'Recap + assign owner', purpose: 'Lock in ownership before the lead cools' },
  { n: 2, dayOffset: 1, slot: '12 PM', channel: 'Call', title: 'Move toward next appointment', purpose: 'Call always leads — never open with text' },
  { n: 3, dayOffset: 1, slot: '4 PM', channel: 'Text', title: 'Text if call went unanswered', purpose: 'Low-friction backup, same day' },
  { n: 4, dayOffset: 1, slot: '7 PM', channel: 'Call', title: 'Ask them to set the next appointment', purpose: 'Push for a date, not a maybe' },
  { n: 5, dayOffset: 2, slot: '12 PM', channel: 'Visit', title: 'Book Fahad at the builder center', purpose: 'The second in-person touch-point' },
  { n: 6, dayOffset: 2, slot: '7 PM', channel: 'Text', title: 'Thank-you / keep the door open', purpose: 'Warm close without asking for anything' },
  { n: 7, dayOffset: 3, slot: '12 PM', channel: 'Call', title: 'Have you decided?', purpose: 'Direct ask, not a soft check-in' },
  { n: 8, dayOffset: 3, slot: '4 PM', channel: 'Call', title: 'Ask when they want to meet Fahad again', purpose: 'Forces a next step even on a stall' },
  { n: 9, dayOffset: 5, slot: '12 PM', channel: 'Email', title: 'Send matched floor plans', purpose: 'Value-add tied to what they liked' },
  { n: 10, dayOffset: 7, slot: '4 PM', channel: 'Text', title: 'Ask if they know anyone we can help', purpose: 'Referral ask while still engaged' },
  { n: 11, dayOffset: 9, slot: '12 PM', channel: 'Call', title: 'Confirm if they want to see more', purpose: 'Re-qualifies interest' },
  { n: 12, dayOffset: 12, slot: '12 PM', channel: 'Call', title: 'Set a meeting — what are you waiting for?', purpose: 'Surfaces the real objection' },
  { n: 13, dayOffset: 16, slot: '12 PM', channel: 'Call', title: 'Introduce mortgage service', purpose: 'New angle, new reason to engage' },
  { n: 14, dayOffset: 23, slot: '12 PM', channel: 'Call', title: 'Release from active status', purpose: 'Break-up message — forces a decision' },
]

const DONE_SCRIPTS: Record<number, string> = {
  1: 'Hi [Name], great connecting today — here\'s a quick recap of what we covered and next steps. I\'m your point of contact from here, so anything at all, just reach out to me directly.',
  2: 'Hey [Name], following up from yesterday — when works better for you to see the builder center in person, this week or next?',
  3: 'Hey [Name], I tried you a little earlier — when works better to see the builder center in person, this week or next?',
  4: 'Hey [Name], I don\'t want this to sit. Can we lock a time for the builder center — this week or next?',
  5: 'Confirm / book [Name] to meet Fahad at the builder center. Get a date on the calendar, not a maybe.',
  6: 'Thanks again for today, [Name] — I\'ll be here if anything comes up as you\'re thinking it over.',
  7: 'So — have you had a chance to think it over?',
  8: 'No rush at all, but when would be a good time to sit down with Fahad again and go deeper?',
  9: 'Pulled a few floor plans that match what you mentioned you liked — the [feature] one especially reminded me of what you described.',
  10: 'Random thought — anyone in your circle also looking? Happy to take great care of them too.',
  11: 'I want to make sure I\'m not missing something — do you want to see more, or has anything changed?',
  12: 'I want to make sure I\'m not missing something — what\'s the one thing that would need to happen for this to make sense for you right now?',
  13: 'Separate from the unit itself — want me to connect you with our mortgage contact just so you know exactly where you\'d stand? No pressure, just information.',
  14: '[Name], I don\'t want to keep reaching out if the timing isn\'t right anymore. A lot of resources go into every client we work with closely, so I have to make room for those who are ready right now. I\'m sad to see this pause, but I\'m always here if that changes.',
}

const NO_SHOW_TOUCHES: Omit<NurtureTouch, 'script'>[] = [
  { n: 1, dayOffset: 0, slot: 'now', channel: 'Email', title: 'Missed you — recap + new times', purpose: 'Re-open the conversation the same hour' },
  { n: 2, dayOffset: 1, slot: '12 PM', channel: 'Call', title: 'Call to reschedule', purpose: 'Call always leads — get a new date' },
  { n: 3, dayOffset: 1, slot: '4 PM', channel: 'Text', title: 'Text if call went unanswered', purpose: 'Low-friction backup, same day' },
  { n: 4, dayOffset: 1, slot: '7 PM', channel: 'Call', title: 'Second call — lock a new appointment', purpose: 'Push for a date, not a maybe' },
  { n: 5, dayOffset: 2, slot: '12 PM', channel: 'Call', title: 'Confirm a makeup appointment', purpose: 'Get the new meeting on the calendar' },
  { n: 6, dayOffset: 2, slot: '7 PM', channel: 'Text', title: 'Door-open text', purpose: 'Warm close without pressure' },
  { n: 7, dayOffset: 3, slot: '12 PM', channel: 'Call', title: 'Ready to pick a new time?', purpose: 'Direct ask to reschedule' },
  { n: 8, dayOffset: 3, slot: '4 PM', channel: 'Call', title: 'Book the makeup meeting', purpose: 'Forces a next step even on a stall' },
  { n: 9, dayOffset: 5, slot: '12 PM', channel: 'Email', title: 'Floor plans + open slots', purpose: 'Value-add plus an easy way back in' },
  { n: 10, dayOffset: 7, slot: '4 PM', channel: 'Text', title: 'Still want to book — plus referral', purpose: 'Stay engaged and ask who else we can help' },
  { n: 11, dayOffset: 9, slot: '12 PM', channel: 'Call', title: 'Re-qualify — still interested?', purpose: 'Confirm they still want a meeting' },
  { n: 12, dayOffset: 12, slot: '12 PM', channel: 'Call', title: 'Last push to reschedule', purpose: 'Surfaces the real objection' },
  { n: 13, dayOffset: 16, slot: '12 PM', channel: 'Call', title: 'Mortgage angle + new time', purpose: 'New reason to re-book' },
  { n: 14, dayOffset: 23, slot: '12 PM', channel: 'Call', title: 'Release from active status', purpose: 'Break-up message — forces a decision' },
]

const NO_SHOW_SCRIPTS: Record<number, string> = {
  1: 'Hi [Name], we missed you at today\'s appointment — no worries, it happens. Here\'s a quick recap of what we were going to cover. Reply with a day that works and I\'ll get you back on the calendar.',
  2: 'Hey [Name], we missed you yesterday — when works better to get this back on the calendar, this week or next?',
  3: 'Hey [Name], I tried you a little earlier. Want me to hold a new time for the appointment we missed — this week or next?',
  4: 'Hey [Name], I don\'t want this to sit. Can we lock a new time for the appointment — this week or next?',
  5: 'Confirm a makeup appointment for [Name]. Get a date and time on the calendar, not a maybe.',
  6: 'Still here if you want to grab a new time, [Name] — happy to make this easy whenever you\'re ready.',
  7: 'Hi [Name], have you had a chance to pick a new time for the appointment we missed?',
  8: 'No rush at all, but when would be a good time to get you back in — this week or next?',
  9: 'Pulled a few floor plans that match what you mentioned you liked — and I can hold a couple of times this week or next if you still want to meet.',
  10: 'Still happy to get you back on the calendar, [Name]. Also — anyone in your circle looking? Happy to take great care of them too.',
  11: 'I want to make sure I\'m not missing something — do you still want to book a new time, or has anything changed?',
  12: 'I want to make sure I\'m not missing something — what\'s the one thing that would need to happen for us to get a new appointment on the calendar?',
  13: 'Separate from the meeting itself — want me to connect you with our mortgage contact so you know where you\'d stand? I can also hold a new appointment time while we do that.',
  14: '[Name], I don\'t want to keep reaching out if the timing isn\'t right anymore. A lot of resources go into every client we work with closely, so I have to make room for those who are ready right now. I\'m sad to see this pause, but I\'m always here if that changes — including booking a new time.',
}

function touchesFor(track: NurtureTrack, firstName: string): NurtureTouch[] {
  const rows = track === 'no_show' ? NO_SHOW_TOUCHES : DONE_TOUCHES
  const scripts = track === 'no_show' ? NO_SHOW_SCRIPTS : DONE_SCRIPTS
  return rows.map((row) => ({
    ...row,
    script: fillName(scripts[row.n] || '', firstName),
  }))
}

export function nurtureOutcomeLabel(outcome: NurtureOutcome | string | null | undefined) {
  switch (String(outcome || '').toLowerCase()) {
    case 'appointment_done':
      return 'Appointment Done'
    case 'no_show':
      return 'No show'
    case 'rescheduled':
      return 'Rescheduled'
    default:
      return ''
  }
}

export function bookingStatusForOutcome(outcome: NurtureOutcome) {
  if (outcome === 'appointment_done') return 'completed'
  if (outcome === 'no_show') return 'no_show'
  return 'rescheduled'
}

export function buildNurtureTaskName(track: NurtureTrack, touch: NurtureTouch) {
  const prefix = track === 'no_show' ? 'No-show' : 'Nurture'
  return `${prefix} T${touch.n} · Day ${touch.dayOffset} · ${touch.channel} — ${touch.title}`
}

export function buildNurtureTaskBody(track: NurtureTrack, touch: NurtureTouch) {
  const trackLabel = track === 'no_show' ? 'No-show reschedule sequence' : '14-touch follow-up (appointment done)'
  return [
    `ISA ${trackLabel} · Touch ${touch.n} of ${NURTURE_TOUCH_COUNT}`,
    `Channel: ${touch.channel} · ${touch.purpose}`,
    '',
    'Say this:',
    touch.script,
  ].join('\n')
}

export function scheduleNurtureTouches(track: NurtureTrack, firstName: string, startYmd = torontoYmd()) {
  const nowPlusFive = new Date(Date.now() + 5 * 60 * 1000)
  return touchesFor(track, firstName).map((touch) => {
    const dueDate = addDaysToYmd(startYmd, touch.dayOffset)
    if (touch.slot === 'now') {
      const dueDateTime = nowPlusFive.toISOString()
      return {
        touch,
        dueDate: nowPlusFive.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }),
        dueDateTime,
        name: buildNurtureTaskName(track, touch),
        body: buildNurtureTaskBody(track, touch),
      }
    }
    const dueDateTime = followUpDueDateTime(dueDate, touch.slot, torontoDayStartIso(dueDate))
    return {
      touch,
      dueDate,
      dueDateTime,
      name: buildNurtureTaskName(track, touch),
      body: buildNurtureTaskBody(track, touch),
    }
  })
}
