import { getSupabaseAdmin } from '@/lib/supabase'
import { fubApiFetch, listFubUsers } from '@/lib/fubApi'
import { matchFubAssignee } from '@/lib/followUpTasks'
import { isBookingStatusCanceled } from '@/lib/bookingTimes'
import { FUB_BOOKING_BRANDS } from '@/lib/fubEmbeddedApp'
import {
  NURTURE_ASSIGNEE,
  NURTURE_TOUCH_COUNT,
  bookingStatusForOutcome,
  nurtureOutcomeLabel,
  scheduleNurtureTouches,
  type AppointmentNurtureRow,
  type NurtureOutcome,
  type NurtureTaskRecord,
  type NurtureTrack,
} from '@/lib/appointmentNurture'

export type NurtureAction = NurtureOutcome | 'stop' | 'restart'

const TABLE_MISSING = /appointment_nurtures|42P01/i

export function isFubNurtureTable(table: string) {
  return FUB_BOOKING_BRANDS.some((brand) => brand.table === table)
}

export function personIdFromFubPerson(person: { id?: number | string } | undefined) {
  const raw = person?.id
  const id = typeof raw === 'number' ? raw : Number(String(raw || '').trim())
  return Number.isFinite(id) && id > 0 ? id : null
}

function isTableMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message || error || '')
  const code = String((error as { code?: string } | null)?.code || '')
  return TABLE_MISSING.test(message) || code === '42P01'
}

function missingTableError() {
  return new Error('Run database/setup_appointment_nurtures.sql in Supabase so appointment nurture can save.')
}

function mapNurtureRow(row: Record<string, unknown>): AppointmentNurtureRow {
  return {
    id: String(row.id || ''),
    booking_id: String(row.booking_id || ''),
    booking_table: String(row.booking_table || ''),
    fub_person_id: Number(row.fub_person_id || 0),
    outcome: String(row.outcome || '') as AppointmentNurtureRow['outcome'],
    status: String(row.status || '') as AppointmentNurtureRow['status'],
    assigned_to: String(row.assigned_to || NURTURE_ASSIGNEE),
    tasks: Array.isArray(row.tasks) ? (row.tasks as NurtureTaskRecord[]) : [],
    started_at: row.started_at ? String(row.started_at) : null,
    stopped_at: row.stopped_at ? String(row.stopped_at) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  }
}

export async function listAppointmentNurtures(personId: number | null): Promise<AppointmentNurtureRow[]> {
  if (!personId) return []
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('appointment_nurtures')
      .select('*')
      .eq('fub_person_id', personId)
      .order('updated_at', { ascending: false })
    if (error) {
      if (isTableMissing(error)) return []
      throw error
    }
    return (data || []).map((row) => mapNurtureRow(row as Record<string, unknown>))
  } catch (error) {
    if (isTableMissing(error)) return []
    throw error
  }
}

async function loadNurture(table: string, bookingId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('appointment_nurtures')
    .select('*')
    .eq('booking_table', table)
    .eq('booking_id', bookingId)
    .maybeSingle()
  if (error) {
    if (isTableMissing(error)) throw missingTableError()
    throw error
  }
  return data ? mapNurtureRow(data as Record<string, unknown>) : null
}

function fubTaskId(json: unknown): number | null {
  if (typeof json === 'number' && Number.isFinite(json) && json > 0) return json
  if (!json || typeof json !== 'object') return null
  const row = json as {
    id?: unknown
    Id?: unknown
    taskId?: unknown
    task?: { id?: unknown }
  }
  const raw = row.id ?? row.Id ?? row.taskId ?? row.task?.id
  const id = typeof raw === 'number' ? raw : Number(String(raw || '').trim())
  return Number.isFinite(id) && id > 0 ? id : null
}

function fubErrorMessage(json: unknown, fallback: string) {
  if (!json || typeof json !== 'object') return fallback
  const row = json as Record<string, unknown>
  const parts = [row.error, row.message, row.errorMessage, row.details]
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') return JSON.stringify(item)
      return ''
    })
    .filter((item) => item && item !== 'true' && item !== 'false')
  if (parts[0]) return parts[0]
  try {
    const raw = JSON.stringify(json)
    return raw && raw !== '{}' ? `${fallback} ${raw}` : fallback
  } catch {
    return fallback
  }
}

async function resolveOfficeAssignee() {
  const users = await listFubUsers().catch((error) => {
    console.error('Nurture FUB users lookup failed:', error)
    return []
  })
  const matched =
    matchFubAssignee(users, { name: NURTURE_ASSIGNEE }) ||
    matchFubAssignee(users, { name: 'Fahad Javed' })
  if (!matched) {
    throw new Error(`Could not find Follow Up Boss user "${NURTURE_ASSIGNEE}".`)
  }
  return {
    assignedTo: matched.name,
    assignedUserId: matched.id > 0 ? matched.id : null,
  }
}

async function createOneNurtureTask(payload: Record<string, unknown>) {
  let created = await fubApiFetch('/tasks', { method: 'POST', body: JSON.stringify(payload) })
  if (!created.ok && payload.assignedUserId && payload.assignedTo) {
    const byId = { ...payload }
    delete byId.assignedTo
    created = await fubApiFetch('/tasks', { method: 'POST', body: JSON.stringify(byId) })
    if (!created.ok) {
      const byName = { ...payload }
      delete byName.assignedUserId
      created = await fubApiFetch('/tasks', { method: 'POST', body: JSON.stringify(byName) })
    }
  }
  return created
}

async function deleteNurtureTasks(tasks: NurtureTaskRecord[]) {
  for (const task of tasks) {
    if (!task.fubTaskId) continue
    try {
      await fubApiFetch(`/tasks/${task.fubTaskId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Nurture task delete failed:', task.fubTaskId, error)
    }
  }
}

async function createTrackTasks(track: NurtureTrack, personId: number, firstName: string, assignee: {
  assignedTo: string
  assignedUserId: number | null
}) {
  const scheduled = scheduleNurtureTouches(track, firstName)
  const tasks: NurtureTaskRecord[] = []
  let createdCount = 0

  for (const item of scheduled) {
    const payload: Record<string, unknown> = {
      personId,
      name: item.name,
      type: 'Follow Up',
      dueDate: item.dueDate,
      dueDateTime: item.dueDateTime,
    }
    if (assignee.assignedUserId) payload.assignedUserId = assignee.assignedUserId
    if (assignee.assignedTo) payload.assignedTo = assignee.assignedTo

    const created = await createOneNurtureTask(payload)
    const fubId = created.ok ? fubTaskId(created.json) : null
    if (!created.ok || !fubId) {
      const error = fubErrorMessage(created.json, `Could not create Touch ${item.touch.n}.`)
      console.error('Nurture FUB task failed:', item.name, created.status, created.json)
      tasks.push({
        touch: item.touch.n,
        fubTaskId: null,
        dueDate: item.dueDate,
        name: item.name,
        error,
      })
      if (createdCount === 0) break
      continue
    }

    createdCount += 1
    tasks.push({
      touch: item.touch.n,
      fubTaskId: fubId,
      dueDate: item.dueDate,
      name: item.name,
    })

    try {
      await fubApiFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({
          personId,
          subject: item.name,
          body: item.body,
        }),
      })
    } catch (error) {
      console.error('Nurture FUB note failed:', item.name, error)
    }
  }

  return { tasks, createdCount }
}

async function updateBookingOutcome(table: string, bookingId: string, outcome: NurtureOutcome) {
  const supabase = getSupabaseAdmin()
  const status = bookingStatusForOutcome(outcome)
  const { data, error } = await supabase
    .from(table)
    .update({ status })
    .eq('id', bookingId)
    .select('id, status')
    .single()
  if (error) throw error
  return data
}

async function saveNurture(row: {
  booking_id: string
  booking_table: string
  fub_person_id: number
  outcome: NurtureOutcome
  status: AppointmentNurtureRow['status']
  assigned_to: string
  tasks: NurtureTaskRecord[]
  started_at: string | null
  stopped_at: string | null
}) {
  const supabase = getSupabaseAdmin()
  const existing = await loadNurture(row.booking_table, row.booking_id)
  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  }
  const query = existing?.id
    ? supabase.from('appointment_nurtures').update(payload).eq('id', existing.id)
    : supabase.from('appointment_nurtures').insert(payload)
  const { data, error } = await query.select('*').single()
  if (error) {
    if (isTableMissing(error)) throw missingTableError()
    throw error
  }
  return mapNurtureRow(data as Record<string, unknown>)
}

export async function applyAppointmentNurture(input: {
  action: NurtureAction
  table: string
  bookingId: string
  personId: number
  leadFirstName: string
}) {
  const supabase = getSupabaseAdmin()
  const { data: booking, error: bookingError } = await supabase
    .from(input.table)
    .select('id, status, firstname')
    .eq('id', input.bookingId)
    .maybeSingle()
  if (bookingError) throw bookingError
  if (!booking) throw new Error('Booking not found.')
  if (isBookingStatusCanceled(booking.status)) {
    throw new Error('This appointment is cancelled.')
  }

  const existing = await loadNurture(input.table, input.bookingId)
  const firstName = input.leadFirstName.trim() || String((booking as { firstname?: string }).firstname || '')

  if (input.action === 'rescheduled') {
    if (existing?.status === 'active') {
      throw new Error('Stop the nurture first if you need to park this as rescheduled.')
    }
    await updateBookingOutcome(input.table, input.bookingId, 'rescheduled')
    const saved = await saveNurture({
      booking_id: input.bookingId,
      booking_table: input.table,
      fub_person_id: input.personId,
      outcome: 'rescheduled',
      status: 'pending',
      assigned_to: NURTURE_ASSIGNEE,
      tasks: existing?.tasks || [],
      started_at: existing?.started_at || null,
      stopped_at: existing?.stopped_at || null,
    })
    return {
      nurture: saved,
      message: 'Marked rescheduled. No tasks created — mark Appointment Done or No show after the new meeting.',
    }
  }

  if (input.action === 'stop') {
    if (!existing || existing.status !== 'active') {
      throw new Error('There is no active nurture to stop.')
    }
    await deleteNurtureTasks(existing.tasks)
    const saved = await saveNurture({
      booking_id: input.bookingId,
      booking_table: input.table,
      fub_person_id: input.personId,
      outcome: existing.outcome,
      status: 'stopped',
      assigned_to: existing.assigned_to || NURTURE_ASSIGNEE,
      tasks: existing.tasks,
      started_at: existing.started_at,
      stopped_at: new Date().toISOString(),
    })
    return { nurture: saved, message: 'Nurture stopped. Remaining Follow Up Boss tasks were removed.' }
  }

  const track: NurtureTrack =
    input.action === 'restart'
      ? existing?.outcome === 'no_show' || existing?.outcome === 'appointment_done'
        ? existing.outcome
        : 'appointment_done'
      : input.action

  if (input.action === 'restart' && (!existing || existing.outcome === 'rescheduled')) {
    throw new Error('Mark Appointment Done or No show before restarting.')
  }

  if (existing?.status === 'active' && (input.action === 'appointment_done' || input.action === 'no_show')) {
    await deleteNurtureTasks(existing.tasks)
  } else if (input.action === 'restart' && existing) {
    await deleteNurtureTasks(existing.tasks)
  }

  const assignee = await resolveOfficeAssignee()
  const { tasks, createdCount } = await createTrackTasks(track, input.personId, firstName, assignee)
  if (createdCount === 0) {
    throw new Error(tasks[0]?.error || 'Could not create Follow Up Boss tasks for Fahad Javed office.')
  }
  await updateBookingOutcome(input.table, input.bookingId, track)
  const saved = await saveNurture({
    booking_id: input.bookingId,
    booking_table: input.table,
    fub_person_id: input.personId,
    outcome: track,
    status: 'active',
    assigned_to: assignee.assignedTo,
    tasks,
    started_at: new Date().toISOString(),
    stopped_at: null,
  })

  const created = createdCount === NURTURE_TOUCH_COUNT
    ? `${NURTURE_TOUCH_COUNT} tasks`
    : `${createdCount} of ${NURTURE_TOUCH_COUNT} tasks`
  const verb = input.action === 'restart' ? 'Restarted' : 'Started'
  return {
    nurture: saved,
    message: `${verb} ${nurtureOutcomeLabel(track)} nurture — ${created} assigned to ${assignee.assignedTo}.`,
  }
}
