/** Broker Guide lives in its own tables. Nothing in this module writes to canada_properties. */

export const BROKER_GUIDE_CODE = 'Broker'
export const BROKER_SESSION_KEY = 'broker_guide_access'
export const BROKER_SESSION_EXPIRY_KEY = 'broker_guide_access_expiry'
export const BROKER_SESSION_MS = 30 * 24 * 60 * 60 * 1000

export const GUIDE_CITIES = ['Brampton', 'Caledon', 'Mississauga', 'Milton', 'Oakville'] as const

export const PLACE_TYPES = ['Site', 'Sales office', 'Site and sales', 'Model home'] as const

export function brokerCodeMatches(input: string | null | undefined): boolean {
  return (input ?? '').trim().toLowerCase() === BROKER_GUIDE_CODE.toLowerCase()
}

export function saveBrokerSession(code: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(BROKER_SESSION_KEY, code.trim())
  localStorage.setItem(BROKER_SESSION_EXPIRY_KEY, String(Date.now() + BROKER_SESSION_MS))
}

export function readBrokerSession(): string | null {
  if (typeof window === 'undefined') return null
  const code = localStorage.getItem(BROKER_SESSION_KEY)
  const expiry = localStorage.getItem(BROKER_SESSION_EXPIRY_KEY)
  if (!code || !expiry) return null
  if (Date.now() > Number(expiry)) {
    clearBrokerSession()
    return null
  }
  if (!brokerCodeMatches(code)) {
    clearBrokerSession()
    return null
  }
  return code
}

export function clearBrokerSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(BROKER_SESSION_KEY)
  localStorage.removeItem(BROKER_SESSION_EXPIRY_KEY)
}

export type BrokerPlace = {
  id: string
  project_id: string
  place_type: string
  map_url: string | null
  cross_streets: string | null
  address: string | null
  phone: string | null
  hours: string | null
  website: string | null
  contacts: string | null
  note: string | null
  sort_order: number
}

export type BrokerProject = {
  id: string
  city: string
  project_name: string
  canada_property_id: string | null
  created_at: string
  updated_at: string
  places: BrokerPlace[]
}

export type PlaceInput = {
  place_type: string
  map_url: string | null
  cross_streets: string | null
  address: string | null
  phone: string | null
  hours: string | null
  website: string | null
  contacts: string | null
  note: string | null
}

export type ProjectInput = {
  city: string
  project_name: string
  canada_property_id: string | null
  places: PlaceInput[]
}

export function cleanText(value: unknown, max = 2000): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export function parseProjectInput(body: unknown): { data: ProjectInput } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Missing project details.' }
  const raw = body as Record<string, unknown>
  const city = cleanText(raw.city, 80)
  const projectName = cleanText(raw.project_name, 200)
  if (!city) return { error: 'Choose a city.' }
  if (!projectName) return { error: 'Enter a project name.' }

  const propertyId = cleanText(raw.canada_property_id, 100)
  if (!Array.isArray(raw.places) || raw.places.length === 0) {
    return { error: 'Add at least one place.' }
  }
  if (raw.places.length > 12) return { error: 'A project can have up to 12 places.' }

  const places: PlaceInput[] = []
  for (const place of raw.places) {
    if (!place || typeof place !== 'object') return { error: 'A place is missing details.' }
    const row = place as Record<string, unknown>
    const placeType = cleanText(row.place_type, 80)
    if (!placeType || placeType.toLowerCase() === 'custom') {
      return { error: 'Each place needs a type. If you chose Custom, type the name.' }
    }
    places.push({
      place_type: placeType,
      map_url: cleanText(row.map_url, 500),
      cross_streets: cleanText(row.cross_streets, 300),
      address: cleanText(row.address, 300),
      phone: cleanText(row.phone, 500),
      hours: cleanText(row.hours, 2000),
      website: cleanText(row.website, 300),
      contacts: cleanText(row.contacts, 2000),
      note: cleanText(row.note, 2000),
    })
  }

  return {
    data: {
      city,
      project_name: projectName,
      canada_property_id: propertyId,
      places,
    },
  }
}

export function isMissingBrokerTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = error.message ?? ''
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /broker_guide_projects|broker_guide_places/i.test(message)
  )
}
