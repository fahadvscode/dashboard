import { isBookingStatusCanceled, formatAppointmentTimeDisplay } from '@/lib/bookingTimes'
import { fubApiFetch } from '@/lib/fubApi'
import { getSupabaseAdmin } from '@/lib/supabase'

const TIME_ZONE = 'America/Toronto'

const LEAD_TABLES = [
  { name: 'FJ leads', table: 'fj_leads' },
  { name: 'Precon Factory leads', table: 'precon_factory_leads' },
  { name: 'Precon Factory website leads', table: 'precon_factory_website_leads' },
  { name: 'GTA Lowrise leads', table: 'gta_lowrise_leads' },
] as const

const BOOKING_TABLES = ['fj_bookings', 'precon_factory_bookings', 'gta_lowrise_bookings'] as const

export type FollowUpAppointment = {
  project: string
  time: string
}

export type FollowUpPerson = {
  name: string
  calls: number
  talkSeconds: number
  incoming: number
  texts: number
  inquiries: number
  appointments: FollowUpAppointment[]
}

export type FollowUpReport = {
  calls: number
  talkSeconds: number
  incoming: number
  texts: number
  leads: number
  leadPages: { name: string; count: number }[]
  inquiries: number
  appointments: number
  people: FollowUpPerson[]
  error: string | null
}

type PersonBucket = FollowUpPerson & { key: string }

function torontoDay(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function dayBounds(day: string) {
  for (const offset of ['-05:00', '-04:00']) {
    const start = new Date(`${day}T00:00:00${offset}`)
    if (torontoDay(start) === day) {
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      const next = new Date(end.getTime() - 60 * 1000)
      if (torontoDay(next) === day) return { start, end }
    }
  }
  const start = new Date(`${day}T05:00:00Z`)
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

function inDay(value: unknown, start: Date, end: Date) {
  const time = new Date(String(value || '')).getTime()
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime()
}

function fubError(json: unknown) {
  if (!json || typeof json !== 'object') return 'Follow Up Boss could not be read.'
  const record = json as { errorMessage?: unknown; error?: unknown; message?: unknown }
  return String(record.errorMessage || record.error || record.message || 'Follow Up Boss could not be read.')
}

async function fubCollection(path: string, keys: string[], start: Date, end: Date) {
  const rows: Record<string, unknown>[] = []
  let offset = 0
  for (let page = 0; page < 30; page += 1) {
    const joiner = path.includes('?') ? '&' : '?'
    const result = await fubApiFetch(`${path}${joiner}limit=100&offset=${offset}`)
    if (!result.ok) throw new Error(fubError(result.json))
    const body = result.json as Record<string, unknown>
    const list = keys.map((key) => body[key]).find(Array.isArray) as Record<string, unknown>[] | undefined
    const batch = list || []
    let older = false
    for (const row of batch) {
      const created = String(row.created || '')
      if (!created) continue
      const time = new Date(created).getTime()
      if (time < start.getTime()) older = true
      else if (inDay(created, start, end)) rows.push(row)
    }
    if (batch.length < 100 || older) break
    offset += 100
  }
  return rows
}

function personKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function firstName(name: string) {
  return personKey(name).split(' ')[0] || ''
}

export async function buildFollowUpReport(day: string): Promise<FollowUpReport> {
  const { start, end } = dayBounds(day)
  const report: FollowUpReport = {
    calls: 0,
    talkSeconds: 0,
    incoming: 0,
    texts: 0,
    leads: 0,
    leadPages: [],
    inquiries: 0,
    appointments: 0,
    people: [],
    error: null,
  }
  const people = new Map<string, PersonBucket>()

  function bucket(name: string) {
    const clean = name.trim() || 'No name'
    const key = personKey(clean)
    const existing = people.get(key)
    if (existing) return existing
    const first = firstName(clean)
    if (first && clean !== 'No name') {
      for (const person of people.values()) {
        if (firstName(person.name) === first) return person
      }
    }
    const created: PersonBucket = {
      key,
      name: clean,
      calls: 0,
      talkSeconds: 0,
      incoming: 0,
      texts: 0,
      inquiries: 0,
      appointments: [],
    }
    people.set(key, created)
    return created
  }

  const notes: string[] = []

  try {
    const [calls, texts, events] = await Promise.all([
      fubCollection('/calls', ['calls'], start, end),
      fubCollection('/textMessages', ['textmessages', 'textMessages'], start, end),
      fubCollection('/events', ['events'], start, end),
    ])

    for (const call of calls) {
      const incoming = call.isIncoming === true
      const seconds = Math.max(0, Number(call.duration) || 0)
      const person = bucket(String(call.userName || ''))
      if (incoming) {
        report.incoming += 1
        person.incoming += 1
      } else {
        report.calls += 1
        report.talkSeconds += seconds
        person.calls += 1
        person.talkSeconds += seconds
      }
    }

    for (const text of texts) {
      if (text.isIncoming !== true) continue
      report.texts += 1
      bucket(String(text.userName || '')).texts += 1
    }

    for (const event of events) {
      const type = String(event.type || '')
      if (!/inquiry/i.test(type)) continue
      report.inquiries += 1
      const person = event.person as { assignedTo?: string } | undefined
      const assigned = String(person?.assignedTo || '').trim()
      if (assigned) bucket(assigned).inquiries += 1
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    notes.push(
      /api key is not set/i.test(message)
        ? 'Follow Up Boss is not connected, so calls, texts, and inquiries are not in this report.'
        : message || 'Follow Up Boss could not be read.',
    )
  }

  const supabase = getSupabaseAdmin()
  for (const source of LEAD_TABLES) {
    const { count, error } = await supabase
      .from(source.table)
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
    if (error) {
      notes.push(`${source.name} could not be counted.`)
      continue
    }
    const total = count || 0
    if (total > 0) report.leadPages.push({ name: source.name, count: total })
    report.leads += total
  }

  for (const table of BOOKING_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select('appointment_time, appointment_type, booked_by, status, project_name, created_at')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
    if (error) {
      notes.push('Appointments could not be counted.')
      continue
    }
    for (const row of data || []) {
      if (isBookingStatusCanceled(row.status)) continue
      if (!inDay(row.created_at, start, end)) continue
      const project = String(row.project_name || row.appointment_type || 'Appointment').trim()
      const time = formatAppointmentTimeDisplay(row.appointment_time)
      const person = bucket(String(row.booked_by || 'Not named'))
      person.appointments.push({ project, time })
      report.appointments += 1
    }
  }

  report.people = [...people.values()]
    .filter((person) => person.calls || person.incoming || person.texts || person.inquiries || person.appointments.length)
    .sort((a, b) => {
      if (a.name === 'No name') return 1
      if (b.name === 'No name') return -1
      return b.calls - a.calls || b.appointments.length - a.appointments.length || a.name.localeCompare(b.name)
    })
    .map(({ key: _key, ...person }) => person)

  report.error = notes.length ? notes.join(' ') : null
  return report
}
