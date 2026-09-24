import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase'
import { FUB_BOOKING_BRANDS } from '@/lib/fubEmbeddedApp'
import { torontoYmd } from '@/lib/bookingDateFilter'

export type FubProjectOption = {
  id: string
  project_name: string
  city: string
  builder: string
}

const SKIP_TAGS = new Set(
  [
    'hot',
    'cold',
    'warm',
    'buyer',
    'seller',
    'lead',
    'new',
    'investor',
    'nurture',
    'listing',
    'vip',
    'sphere',
    'past client',
    'so i',
    'contacted',
    'unsubscribed',
    'escalation',
  ].map((item) => item.toLowerCase())
)

export function extractFubTags(person?: { tags?: unknown } | null): string[] {
  const raw = person?.tags
  if (!Array.isArray(raw)) return []
  const tags: string[] = []
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) tags.push(item.trim())
    else if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') {
      const name = String((item as { name: string }).name).trim()
      if (name) tags.push(name)
    }
  }
  return [...new Set(tags)]
}

function idsFromTags(tags: string[]) {
  const ids = new Set<string>()
  for (const tag of tags) {
    const uuid = tag.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuid) ids.add(uuid[0])
    if (!/\s/.test(tag) && tag.length >= 6) ids.add(tag)
  }
  return [...ids]
}

function nameQueriesFromTags(tags: string[]) {
  return tags.filter((tag) => {
    if (tag.length < 4) return false
    if (SKIP_TAGS.has(tag.toLowerCase())) return false
    if (/^[0-9a-f-]{8,}$/i.test(tag) && tag.includes('-')) return false
    return true
  })
}

function mapRows(rows: unknown[] | null): FubProjectOption[] {
  const seen = new Set<string>()
  const next: FubProjectOption[] = []
  for (const row of rows ?? []) {
    const item = row as Record<string, unknown>
    const id = String(item.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    next.push({
      id,
      project_name: String(item.project_name || ''),
      city: String(item.city || ''),
      builder: String(item.builder || ''),
    })
  }
  return next
}

export async function matchProjectsFromTags(tags: string[]): Promise<FubProjectOption[]> {
  if (tags.length === 0) return []
  const supabase = getSupabaseAdmin()
  const ids = idsFromTags(tags)
  const names = nameQueriesFromTags(tags)
  const collected: unknown[] = []

  if (ids.length > 0) {
    const { data } = await supabase
      .from('canada_properties')
      .select('id, project_name, city, builder')
      .in('id', ids)
    collected.push(...(data ?? []))
  }

  for (const name of names.slice(0, 8)) {
    const { data } = await supabase
      .from('canada_properties')
      .select('id, project_name, city, builder')
      .ilike('project_name', `%${name.replace(/[%_]/g, '')}%`)
      .limit(5)
    collected.push(...(data ?? []))
  }

  return mapRows(collected)
}

export async function searchCanadaProjects(query: string): Promise<FubProjectOption[]> {
  const q = query.trim()
  if (q.length < 1) return []
  const supabase = getSupabaseAdmin()
  const safe = q.replace(/[%_,]/g, '').slice(0, 80)
  if (!safe) return []

  const { data: byId } = await supabase
    .from('canada_properties')
    .select('id, project_name, city, builder')
    .eq('id', q)
    .limit(5)

  const { data: byName } = await supabase
    .from('canada_properties')
    .select('id, project_name, city, builder')
    .or(`project_name.ilike.%${safe}%,builder.ilike.%${safe}%,city.ilike.%${safe}%`)
    .limit(8)

  return mapRows([...(byId ?? []), ...(byName ?? [])]).slice(0, 8)
}

export type FubBookingKind = 'upcoming' | 'past' | 'cancelled' | 'rescheduled' | 'done' | 'no_show'

export type FubRescheduleMove = {
  at: string
  from_date: string
  from_time: string
  to_date: string
  to_time: string
}

export type FubAppointment = {
  id: string
  table: string
  brand: string
  project_name: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  booked_by?: string | null
  status: string
  created_at?: string
  kind?: FubBookingKind
  moves?: FubRescheduleMove[]
}

export function fubBookingKind(status: string, appointmentDate: string, today: string): FubBookingKind {
  const normalized = status.trim().toLowerCase()
  if (normalized === 'canceled' || normalized === 'cancelled') return 'cancelled'
  if (normalized === 'rescheduled') return 'rescheduled'
  if (normalized === 'no_show') return 'no_show'
  if (normalized === 'completed') return 'done'
  if (appointmentDate && appointmentDate >= today) return 'upcoming'
  return 'past'
}

export function fubBookingKindLabel(kind: FubBookingKind) {
  switch (kind) {
    case 'upcoming':
      return 'Upcoming'
    case 'past':
      return 'Already happened'
    case 'cancelled':
      return 'Cancelled'
    case 'rescheduled':
      return 'Rescheduled'
    case 'done':
      return 'Appointment done'
    case 'no_show':
      return 'No show'
  }
}

export function fubBookingHistorySummary(items: Array<{ kind?: FubBookingKind }>) {
  if (items.length === 0) {
    return {
      headline: 'Not booked before',
      detail: 'No meetings on this email or phone yet.',
    }
  }
  const count = (kind: FubBookingKind) => items.filter((item) => item.kind === kind).length
  const earlier = items.length - count('upcoming')
  const parts: string[] = []
  if (count('upcoming')) parts.push(`${count('upcoming')} upcoming`)
  if (count('past')) parts.push(`${count('past')} already happened`)
  if (count('rescheduled')) parts.push(`${count('rescheduled')} rescheduled`)
  if (count('cancelled')) parts.push(`${count('cancelled')} cancelled`)
  if (count('done')) parts.push(`${count('done')} appointment done`)
  if (count('no_show')) parts.push(`${count('no_show')} no show`)
  const headline =
    earlier > 0
      ? `Booked before — ${items.length} meeting${items.length === 1 ? '' : 's'}`
      : items.length === 1
        ? '1 upcoming meeting — not booked before'
        : `${items.length} upcoming meetings — not booked before`
  return { headline, detail: parts.join(' · ') }
}

export function parseRescheduleLog(value: unknown): FubRescheduleMove[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const from_date = String(row.from_date || '')
    const to_date = String(row.to_date || '')
    if (!from_date || !to_date) return []
    return [{
      at: String(row.at || ''),
      from_date,
      from_time: String(row.from_time || ''),
      to_date,
      to_time: String(row.to_time || ''),
    }]
  })
}

export async function appendBookingRescheduleLog(
  supabase: SupabaseClient,
  table: string,
  bookingId: string,
  existing: unknown,
  move: FubRescheduleMove
) {
  const next = [...parseRescheduleLog(existing), move].slice(-20)
  const { error } = await supabase.from(table).update({ reschedule_log: next }).eq('id', bookingId)
  if (error) console.warn('Could not store reschedule history:', error.message)
}

function lastTenDigits(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

export function bookingMatchesContact(
  booking: { email?: string | null; phone?: string | null },
  email: string,
  phone: string,
  extraEmails: string[] = [],
  extraPhones: string[] = []
) {
  const emails = [email, ...extraEmails].map((item) => item.trim().toLowerCase()).filter(Boolean)
  const phones = [phone, ...extraPhones].map(lastTenDigits).filter((item) => item.length >= 10)
  const bookingEmail = String(booking.email || '').trim().toLowerCase()
  const bookingPhone = lastTenDigits(String(booking.phone || ''))
  if (bookingEmail && emails.includes(bookingEmail)) return true
  if (bookingPhone.length >= 10 && phones.includes(bookingPhone)) return true
  return false
}

const BOOKING_HISTORY_COLUMNS =
  'id, email, phone, appointment_date, appointment_time, appointment_type, booked_by, status, project_name, created_at, reschedule_log'

let bookingHistorySelect = BOOKING_HISTORY_COLUMNS

export async function listUpcomingFubAppointments(
  email: string,
  phone: string,
  extraEmails: string[] = [],
  extraPhones: string[] = []
): Promise<FubAppointment[]> {
  const supabase = getSupabaseAdmin()
  const today = torontoYmd()
  const emails = [...new Set([email, ...extraEmails].map((item) => item.trim().toLowerCase()).filter(Boolean))]
  const phones = [...new Set([phone, ...extraPhones].map(lastTenDigits).filter((item) => item.length >= 10))]
  if (emails.length === 0 && phones.length === 0) return []

  const collected: FubAppointment[] = []
  const seen = new Set<string>()

  for (const brand of FUB_BOOKING_BRANDS) {
    const batches: Array<Record<string, unknown>>[] = []
    for (const emailNorm of emails) {
      const rows = await loadBookingRows(supabase, brand.table, 'email', emailNorm)
      batches.push(rows)
    }
    for (const phoneKey of phones) {
      const rows = await loadBookingRows(supabase, brand.table, 'phone', phoneKey)
      batches.push(rows)
    }
    for (const batch of batches) {
      for (const row of batch) {
        const item = row as {
          id?: string
          email?: string | null
          phone?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          appointment_type?: string | null
          booked_by?: string | null
          status?: string | null
          project_name?: string | null
          created_at?: string | null
          reschedule_log?: unknown
        }
        const emailMatch = emails.includes(String(item.email || '').trim().toLowerCase())
        const phoneMatch = phones.includes(lastTenDigits(String(item.phone || '')))
        if (!emailMatch && !phoneMatch) continue
        const key = `${brand.table}:${item.id}`
        if (!item.id || seen.has(key)) continue
        seen.add(key)
        const appointmentDate = String(item.appointment_date || '')
        const status = String(item.status || '')
        collected.push({
          id: String(item.id),
          table: brand.table,
          brand: brand.label,
          project_name: String(item.project_name || 'Meeting'),
          appointment_date: appointmentDate,
          appointment_time: String(item.appointment_time || ''),
          appointment_type: String(item.appointment_type || ''),
          booked_by: String(item.booked_by || ''),
          status,
          created_at: String(item.created_at || ''),
          kind: fubBookingKind(status, appointmentDate, today),
          moves: parseRescheduleLog(item.reschedule_log),
        })
      }
    }
  }

  collected.sort((a, b) => {
    const aUpcoming = a.kind === 'upcoming'
    const bUpcoming = b.kind === 'upcoming'
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
    if (aUpcoming) {
      return a.appointment_date.localeCompare(b.appointment_date) || a.appointment_time.localeCompare(b.appointment_time)
    }
    const aWhen = a.created_at || a.appointment_date
    const bWhen = b.created_at || b.appointment_date
    return bWhen.localeCompare(aWhen)
  })

  return collected.slice(0, 40)
}

async function loadBookingRows(
  supabase: SupabaseClient,
  table: string,
  field: 'email' | 'phone',
  value: string
) {
  const filter = field === 'email' ? value : `%${value}%`
  const run = (columns: string) =>
    supabase.from(table).select(columns).ilike(field, filter).limit(50)

  let { data, error } = await run(bookingHistorySelect)
  if (error && bookingHistorySelect.includes('reschedule_log') && /reschedule_log/i.test(error.message)) {
    bookingHistorySelect = BOOKING_HISTORY_COLUMNS.replace(', reschedule_log', '')
    const retry = await run(bookingHistorySelect)
    data = retry.data
    error = retry.error
  }
  if (error) {
    console.error(`FUB booking history failed for ${table}:`, error.message)
    return []
  }
  return (data ?? []) as Array<Record<string, unknown>>
}

export async function fetchFollowUpBossPersonTags(personId: string): Promise<string[]> {
  const apiKey =
    String((process.env as Record<string, string | undefined>).FUB_API_KEY || '').trim() ||
    String((process.env as Record<string, string | undefined>).FOLLOW_UP_BOSS_API_KEY || '').trim()
  if (!apiKey || !personId) return []

  try {
    const headers: Record<string, string> = {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      Accept: 'application/json',
    }
    const system = String((process.env as Record<string, string | undefined>).FUB_X_SYSTEM || '').trim()
    if (system) headers['X-System'] = system

    const response = await fetch(`https://api.followupboss.com/v1/people/${encodeURIComponent(personId)}`, {
      headers,
    })
    if (!response.ok) return []
    const payload = (await response.json()) as Record<string, unknown>
    const tags = extractFubTags(payload)
    const extras: string[] = []
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string' && /project/i.test(key) && value.trim()) extras.push(value.trim())
    }
    return [...new Set([...tags, ...extras])]
  } catch {
    return []
  }
}
