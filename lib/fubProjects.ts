import { getSupabaseAdmin } from '@/lib/supabase'
import { FUB_BOOKING_BRANDS } from '@/lib/fubEmbeddedApp'
import { isBookingStatusCanceled } from '@/lib/bookingTimes'

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

export async function listUpcomingFubAppointments(email: string, phone: string): Promise<FubAppointment[]> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  const emailNorm = email.trim().toLowerCase()
  const phoneKey = lastTenDigits(phone)
  const collected: FubAppointment[] = []

  for (const brand of FUB_BOOKING_BRANDS) {
    const { data } = await supabase
      .from(brand.table)
      .select('id, email, phone, appointment_date, appointment_time, appointment_type, booked_by, status, project_name')
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .limit(40)

    for (const row of data ?? []) {
      const item = row as {
        id: string
        email?: string | null
        phone?: string | null
        appointment_date: string
        appointment_time: string
        appointment_type?: string | null
        booked_by?: string | null
        status?: string
        project_name?: string | null
      }
      if (isBookingStatusCanceled(item.status)) continue
      const emailMatch = emailNorm && String(item.email || '').trim().toLowerCase() === emailNorm
      const phoneMatch = phoneKey.length >= 10 && lastTenDigits(String(item.phone || '')) === phoneKey
      if (!emailMatch && !phoneMatch) continue
      collected.push({
        id: String(item.id),
        table: brand.table,
        brand: brand.label,
        project_name: String(item.project_name || 'Meeting'),
        appointment_date: String(item.appointment_date || ''),
        appointment_time: String(item.appointment_time || ''),
        appointment_type: String(item.appointment_type || ''),
        booked_by: String(item.booked_by || ''),
        status: String(item.status || ''),
      })
    }
  }

  return collected.slice(0, 8)
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
