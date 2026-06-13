import { format, formatDistanceToNow, isPast, isToday, parseISO, startOfDay, isValid } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildDisplayName,
  CONTACT_SOURCE_TABLES,
  SEARCHABLE_BOOKING_TABLES,
  SEARCHABLE_CONTACT_TABLES,
  SEARCHABLE_LEAD_TABLES,
  type ContactSearchResult,
  type ContactSourceKind,
  type ContactSourceTable,
  type ContactSuggestionTag,
} from '@/lib/hotLeads'

const LANDING_PAGE_TABLES = new Set<ContactSourceTable>([
  'cornerstone_leads',
  'novella_leads',
  'lakeview_village_leads',
  'rollingwood_leads',
  'enclave',
  'hawthorne_east_village',
  'bronte_trails',
  'spruce_trails',
  'meadowvale_brooks',
])

const TABLES_WITH_FULL_NAME = new Set<ContactSourceTable>(['rental_leads'])
const TABLES_WITH_ALT_NAME = new Set<ContactSourceTable>(['precon_factory_website_leads'])

const BOOKING_TABLES = new Set<ContactSourceTable>(SEARCHABLE_BOOKING_TABLES)

const RESULTS_PER_TABLE_SEARCH = 15
const SUGGESTIONS_PAST_BOOKINGS_PER_TABLE = 6
const SUGGESTIONS_UPCOMING_BOOKINGS_PER_TABLE = 3
const SUGGESTIONS_PER_LEAD_TABLE = 4
const MEMORY_SCAN_LIMIT = 500
const MAX_RESULTS = 50

type RawRow = Record<string, unknown>

function todayDateString(): string {
  return format(startOfDay(new Date()), 'yyyy-MM-dd')
}

/** PostgREST requires double-quoted ilike values when the pattern contains spaces or commas */
function ilikeQuoted(term: string): string {
  const escaped = term
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '""')
    .replace(/[%_]/g, (m) => `\\${m}`)
  return `"%${escaped}%"`
}

export function minQueryLength(q: string): number {
  const trimmed = q.trim()
  if (!trimmed) return 0
  if (/^\d+$/.test(trimmed)) return 3
  return 1
}

function usesLandingNameColumns(table: ContactSourceTable): boolean {
  return LANDING_PAGE_TABLES.has(table)
}

function resolvePersonName(row: RawRow): { first?: string; last?: string } {
  const firstRaw = row.firstname ?? row.first_name
  const lastRaw = row.lastname ?? row.last_name
  if (firstRaw || lastRaw) {
    return {
      first: firstRaw ? String(firstRaw) : '',
      last: lastRaw ? String(lastRaw) : '',
    }
  }
  const combined = row.full_name ?? row.name ?? row.fullName ?? row.contact_name
  if (combined && typeof combined === 'string') {
    const parts = combined.trim().split(/\s+/).filter(Boolean)
    if (parts.length > 0) {
      return { first: parts[0], last: parts.slice(1).join(' ') }
    }
  }
  return {}
}

function selectColumns(table: ContactSourceTable): string {
  if (usesLandingNameColumns(table)) {
    return 'id, first_name, last_name, email, phone, created_at'
  }
  if (BOOKING_TABLES.has(table)) {
    return 'id, firstname, lastname, email, phone, project_name, created_at, appointment_date, appointment_time, status'
  }
  if (TABLES_WITH_FULL_NAME.has(table)) {
    return 'id, firstname, lastname, full_name, email, phone, project_name, created_at'
  }
  if (TABLES_WITH_ALT_NAME.has(table)) {
    return 'id, firstname, lastname, full_name, name, email, phone, project_name, created_at'
  }
  return 'id, firstname, lastname, email, phone, project_name, created_at'
}

function parseActivityDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

function getAppointmentDate(row: RawRow): Date | null {
  const apptDate = row.appointment_date as string | undefined
  const apptTime = row.appointment_time as string | undefined
  if (!apptDate) return null
  const combined = apptTime ? `${apptDate}T${apptTime}` : apptDate
  return parseActivityDate(combined) ?? parseActivityDate(apptDate)
}

function resolveActivityAt(row: RawRow, kind: ContactSourceKind): string {
  const created = parseActivityDate(row.created_at)
  if (kind === 'booking') {
    const appt = getAppointmentDate(row)
    if (appt && created) {
      return (appt > created ? appt : created).toISOString()
    }
    if (appt) return appt.toISOString()
  }
  return created?.toISOString() ?? new Date(0).toISOString()
}

function bookingSuggestionTag(row: RawRow): ContactSuggestionTag {
  const appt = getAppointmentDate(row)
  if (!appt) return null
  if (isToday(appt)) return 'meeting_today'
  if (isPast(appt) && !isToday(appt)) return 'meeting_passed'
  return 'meeting_upcoming'
}

function formatAppointmentLabel(row: RawRow): string | null {
  const appt = getAppointmentDate(row)
  if (!appt) return null
  const apptTime = row.appointment_time as string | undefined
  const datePart = format(appt, 'MMM d, yyyy')
  return apptTime ? `${datePart} at ${apptTime}` : datePart
}

function formatActivitySummary(
  kind: ContactSourceKind,
  activityAt: string,
  row: RawRow,
  options?: { forSuggestions?: boolean }
): string {
  if (kind === 'booking') {
    const label = formatAppointmentLabel(row)
    const tag = bookingSuggestionTag(row)
    if (tag === 'meeting_passed' && label) {
      return options?.forSuggestions
        ? `Meeting passed · ${label} — good follow-up candidate`
        : `Meeting passed · ${label}`
    }
    if (tag === 'meeting_today' && label) {
      return `Meeting today · ${label}`
    }
    if (tag === 'meeting_upcoming' && label) {
      return `Upcoming meeting · ${label}`
    }
    const when = formatDistanceToNow(parseISO(activityAt), { addSuffix: true })
    return label ? `Booked · ${label}` : `Booked · ${when}`
  }

  const date = parseActivityDate(activityAt)
  const when = date ? formatDistanceToNow(date, { addSuffix: true }) : 'recently'
  return `Lead · ${when}`
}

function rowToResult(
  table: ContactSourceTable,
  row: RawRow,
  options?: { forSuggestions?: boolean }
): ContactSearchResult {
  const kind = CONTACT_SOURCE_TABLES[table].kind
  const { first, last } = resolvePersonName(row)
  const activityAt = resolveActivityAt(row, kind)
  const tag =
    kind === 'booking'
      ? bookingSuggestionTag(row)
      : options?.forSuggestions
        ? 'recent_lead'
        : null

  return {
    source_table: table,
    source_id: String(row.id),
    display_name: buildDisplayName(first, last),
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    project_name: (row.project_name as string) ?? null,
    source_kind: kind,
    activity_at: activityAt,
    activity_summary: formatActivitySummary(kind, activityAt, row, options),
    suggestion_tag: tag,
  }
}

function rowMatchesQuery(row: RawRow, query: string, table: ContactSourceTable): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false

  const { first: firstRaw, last: lastRaw } = resolvePersonName(row)
  const first = (firstRaw ?? '').toLowerCase()
  const last = (lastRaw ?? '').toLowerCase()
  const full = `${first} ${last}`.trim()
  const email = String(row.email ?? '').toLowerCase()
  const phone = String(row.phone ?? '').replace(/\D/g, '')
  const project = String(row.project_name ?? '').toLowerCase()
  const qDigits = q.replace(/\D/g, '')

  const extraNames = [
    row.full_name,
    row.name,
    row.fullName,
    row.contact_name,
  ]
    .filter((v) => typeof v === 'string')
    .map((v) => (v as string).toLowerCase())

  const haystack = [first, last, full, email, project, ...extraNames].filter(Boolean)

  const words = q.split(/\s+/).filter((w) => w.length > 0)
  if (words.length >= 2) {
    const w0 = words[0]
    const wRest = words.slice(1).join(' ')
    if (
      (first.includes(w0) && last.includes(wRest)) ||
      (first.includes(wRest) && last.includes(w0))
    ) {
      return true
    }
    if (extraNames.some((n) => n.includes(q))) return true
  }

  if (haystack.some((v) => v.includes(q))) return true
  if (qDigits.length >= 3 && phone.includes(qDigits)) return true

  return words.some(
    (w) =>
      haystack.some((v) => v.includes(w)) ||
      (w.length >= 3 && phone.includes(w.replace(/\D/g, '')))
  )
}

function buildOrFilter(table: ContactSourceTable, query: string): string {
  const landing = usesLandingNameColumns(table)
  const firstCol = landing ? 'first_name' : 'firstname'
  const lastCol = landing ? 'last_name' : 'lastname'
  const parts: string[] = []

  const fullPattern = ilikeQuoted(query.trim())
  parts.push(
    `${firstCol}.ilike.${fullPattern}`,
    `${lastCol}.ilike.${fullPattern}`,
    `email.ilike.${fullPattern}`,
    `phone.ilike.${fullPattern}`
  )

  if (TABLES_WITH_FULL_NAME.has(table)) {
    parts.push(`full_name.ilike.${fullPattern}`)
  }
  if (TABLES_WITH_ALT_NAME.has(table)) {
    parts.push(`full_name.ilike.${fullPattern}`, `name.ilike.${fullPattern}`)
  }

  if (!landing) {
    parts.push(`project_name.ilike.${fullPattern}`)
  } else if (table === 'enclave') {
    parts.push(
      `model.ilike.${fullPattern}`,
      `collection.ilike.${fullPattern}`,
      `form_name.ilike.${fullPattern}`,
      `source.ilike.${fullPattern}`
    )
  } else if (table === 'hawthorne_east_village' || table === 'bronte_trails' || table === 'spruce_trails') {
    parts.push(
      `is_broker.ilike.${fullPattern}`,
      `form_type.ilike.${fullPattern}`,
      `page_path.ilike.${fullPattern}`,
      `source.ilike.${fullPattern}`
    )
    if (table === 'bronte_trails' || table === 'spruce_trails') {
      parts.push(`project_tag.ilike.${fullPattern}`)
    }
    if (table === 'spruce_trails') {
      parts.push(`interest.ilike.${fullPattern}`)
    }
  } else if (table === 'meadowvale_brooks') {
    parts.push(
      `realtor.ilike.${fullPattern}`,
      `buyer_type.ilike.${fullPattern}`,
      `timeline.ilike.${fullPattern}`,
      `project.ilike.${fullPattern}`,
      `source_page.ilike.${fullPattern}`
    )
  }

  const words = query.trim().split(/\s+/).filter((w) => w.length > 0)
  if (words.length >= 2) {
    const p0 = ilikeQuoted(words[0])
    const p1 = ilikeQuoted(words.slice(1).join(' '))
    parts.push(`and(${firstCol}.ilike.${p0},${lastCol}.ilike.${p1})`)
    parts.push(`and(${firstCol}.ilike.${p1},${lastCol}.ilike.${p0})`)
  } else if (words.length === 1 && words[0].length >= 1) {
    const p = ilikeQuoted(words[0])
    parts.push(`${firstCol}.ilike.${p}`, `${lastCol}.ilike.${p}`)
  }

  return parts.join(',')
}

function dedupeKey(r: ContactSearchResult): string {
  const email = r.email?.toLowerCase().trim()
  if (email) return `email:${email}`
  const phone = r.phone?.replace(/\D/g, '')
  if (phone && phone.length >= 10) return `phone:${phone.slice(-10)}`
  return `id:${r.source_table}:${r.source_id}`
}

function suggestionBoost(r: ContactSearchResult): number {
  switch (r.suggestion_tag) {
    case 'meeting_passed':
      return 72 * 60 * 60 * 1000
    case 'meeting_today':
      return 48 * 60 * 60 * 1000
    case 'meeting_upcoming':
      return 24 * 60 * 60 * 1000
    default:
      return 0
  }
}

function sortScore(r: ContactSearchResult): number {
  const t = new Date(r.activity_at).getTime()
  return t + suggestionBoost(r)
}

export function mergeAndRankResults(results: ContactSearchResult[]): ContactSearchResult[] {
  const byKey = new Map<string, ContactSearchResult>()

  for (const r of results) {
    const key = dedupeKey(r)
    const existing = byKey.get(key)
    if (!existing || sortScore(r) > sortScore(existing)) {
      byKey.set(key, r)
    }
  }

  return [...byKey.values()]
    .sort((a, b) => sortScore(b) - sortScore(a))
    .slice(0, MAX_RESULTS)
}

async function queryTableWithMemory(
  supabase: SupabaseClient,
  table: ContactSourceTable,
  query: string,
  limit: number
): Promise<ContactSearchResult[]> {
  const { data, error } = await supabase
    .from(table)
    .select(selectColumns(table))
    .order('created_at', { ascending: false })
    .limit(MEMORY_SCAN_LIMIT)

  if (error) {
    console.warn(`hot-leads memory search: ${table} — ${error.message}`)
    return []
  }

  return (data ?? [])
    .filter((row) => rowMatchesQuery(row as RawRow, query, table))
    .slice(0, limit)
    .map((row) => rowToResult(table, row as RawRow))
}

async function queryTable(
  supabase: SupabaseClient,
  table: ContactSourceTable,
  options: { query?: string; limit: number; forSuggestions?: boolean }
): Promise<ContactSearchResult[]> {
  if (!options.query?.trim()) {
    const { data, error } = await supabase
      .from(table)
      .select(selectColumns(table))
      .order('created_at', { ascending: false })
      .limit(options.limit)

    if (error) {
      console.warn(`hot-leads list: ${table} — ${error.message}`)
      return []
    }
    return (data ?? []).map((row) =>
      rowToResult(table, row as RawRow, { forSuggestions: options.forSuggestions })
    )
  }

  const q = options.query.trim()
  const orFilter = buildOrFilter(table, q)

  const { data, error } = await supabase
    .from(table)
    .select(selectColumns(table))
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(options.limit)

  let ilikeResults: ContactSearchResult[] = []
  if (!error && data) {
    ilikeResults = data.map((row) => rowToResult(table, row as RawRow))
  } else if (error) {
    console.warn(`hot-leads ilike search: ${table} — ${error.message}`)
  }

  const memoryResults = await queryTableWithMemory(supabase, table, q, options.limit)
  return mergeAndRankResults([...ilikeResults, ...memoryResults]).slice(0, options.limit)
}

async function fetchPastBookings(
  supabase: SupabaseClient,
  table: ContactSourceTable,
  limit: number
): Promise<ContactSearchResult[]> {
  const today = todayDateString()
  const { data, error } = await supabase
    .from(table)
    .select(selectColumns(table))
    .not('appointment_date', 'is', null)
    .lt('appointment_date', today)
    .order('appointment_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn(`hot-leads past bookings: ${table} — ${error.message}`)
    return []
  }

  return (data ?? []).map((row) =>
    rowToResult(table, row as RawRow, { forSuggestions: true })
  )
}

async function fetchUpcomingBookings(
  supabase: SupabaseClient,
  table: ContactSourceTable,
  limit: number
): Promise<ContactSearchResult[]> {
  const today = todayDateString()
  const { data, error } = await supabase
    .from(table)
    .select(selectColumns(table))
    .not('appointment_date', 'is', null)
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .limit(limit)

  if (error) {
    console.warn(`hot-leads upcoming bookings: ${table} — ${error.message}`)
    return []
  }

  return (data ?? []).map((row) =>
    rowToResult(table, row as RawRow, { forSuggestions: true })
  )
}

export async function searchContacts(
  supabase: SupabaseClient,
  query: string
): Promise<ContactSearchResult[]> {
  const q = query.trim()
  if (!q) return []

  const searches = SEARCHABLE_CONTACT_TABLES.map((table) =>
    queryTable(supabase, table, { query: q, limit: RESULTS_PER_TABLE_SEARCH })
  )

  const nested = await Promise.all(searches)
  return mergeAndRankResults(nested.flat())
}

export async function fetchContactSuggestions(
  supabase: SupabaseClient
): Promise<ContactSearchResult[]> {
  const pastBookingFetches = SEARCHABLE_BOOKING_TABLES.map((table) =>
    fetchPastBookings(supabase, table, SUGGESTIONS_PAST_BOOKINGS_PER_TABLE)
  )
  const upcomingBookingFetches = SEARCHABLE_BOOKING_TABLES.map((table) =>
    fetchUpcomingBookings(supabase, table, SUGGESTIONS_UPCOMING_BOOKINGS_PER_TABLE)
  )
  const leadFetches = SEARCHABLE_LEAD_TABLES.map((table) =>
    queryTable(supabase, table, {
      limit: SUGGESTIONS_PER_LEAD_TABLE,
      forSuggestions: true,
    })
  )

  const nested = await Promise.all([
    ...pastBookingFetches,
    ...upcomingBookingFetches,
    ...leadFetches,
  ])
  return mergeAndRankResults(nested.flat())
}
