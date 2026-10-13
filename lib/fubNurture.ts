import { getSupabaseAdmin } from '@/lib/supabase'
import { fubApiFetch } from '@/lib/fubApi'
import { isBookingStatusCanceled } from '@/lib/bookingTimes'
import { FUB_BOOKING_BRANDS } from '@/lib/fubEmbeddedApp'
import {
  NURTURE_ASSIGNEE,
  bookingStatusForOutcome,
  nurtureOutcomeLabel,
  type AppointmentNurtureRow,
  type NurtureOutcome,
  type NurtureTaskRecord,
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
      tasks: [],
      started_at: existing.started_at,
      stopped_at: new Date().toISOString(),
    })
    return { nurture: saved, message: 'Nurture stopped. Remaining Follow Up Boss tasks were removed.' }
  }

  if (input.action === 'appointment_done' || input.action === 'no_show') {
    if (existing?.tasks?.length) {
      await deleteNurtureTasks(existing.tasks)
    }
    await updateBookingOutcome(input.table, input.bookingId, input.action)
    const saved = await saveNurture({
      booking_id: input.bookingId,
      booking_table: input.table,
      fub_person_id: input.personId,
      outcome: input.action,
      status: 'stopped',
      assigned_to: existing?.assigned_to || NURTURE_ASSIGNEE,
      tasks: [],
      started_at: null,
      stopped_at: new Date().toISOString(),
    })
    return {
      nurture: saved,
      message: `Marked ${nurtureOutcomeLabel(input.action)}. No follow-up tasks created.`,
    }
  }

  throw new Error('Follow-up tasks are no longer created after Appointment Done or No show.')
}
