import { fubApiFetch } from '@/lib/fubApi'
import type { WorksheetPerson } from '@/lib/worksheetTypes'

const CLIENT_ID_FIELD_FALLBACK = 'customClientID'
const PERSON_FIELDS = 'id,name,firstName,lastName,emails,phones,addresses,allCustom'

let cachedClientIdField = ''

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function fubError(json: unknown, fallback: string) {
  if (json && typeof json === 'object') {
    const body = json as Record<string, unknown>
    const message = body.errorMessage || body.message || body.error
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

async function resolveClientIdField() {
  if (cachedClientIdField) return cachedClientIdField
  try {
    const result = await fubApiFetch('/customFields?limit=100')
    const body = result.ok && result.json && typeof result.json === 'object' ? (result.json as Record<string, unknown>) : {}
    const fields = body.customfields || body.customFields || body.fields || []
    const match = (Array.isArray(fields) ? fields : []).find((field) => {
      if (!field || typeof field !== 'object') return false
      return text((field as { label?: unknown }).label).toLowerCase() === 'client id'
    }) as { name?: unknown } | undefined
    cachedClientIdField = text(match?.name) || CLIENT_ID_FIELD_FALLBACK
  } catch {
    cachedClientIdField = CLIENT_ID_FIELD_FALLBACK
  }
  return cachedClientIdField
}

function contactValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  const row = value as { value?: unknown; normalized?: unknown }
  return text(row.value) || text(row.normalized)
}

function firstContact(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return ''
  return contactValue(value[0])
}

function customValue(person: Record<string, unknown>, needles: string[]) {
  for (const [key, value] of Object.entries(person)) {
    if (!/^custom/i.test(key)) continue
    const label = key.replace(/^custom/i, '').toLowerCase()
    if (!needles.some((needle) => label.includes(needle))) continue
    const found = text(value)
    if (found) return found
  }
  return ''
}

function toPerson(row: Record<string, unknown>, clientField: string, searchedId: string): WorksheetPerson {
  const address = Array.isArray(row.addresses) ? (row.addresses[0] as Record<string, unknown> | undefined) : undefined
  const firstName = text(row.firstName)
  const lastName = text(row.lastName)
  const name = text(row.name) || `${firstName} ${lastName}`.trim()
  return {
    id: String(row.id || ''),
    clientId: text(row[clientField]) || searchedId,
    firstName,
    lastName,
    name,
    email: firstContact(row.emails),
    phone: firstContact(row.phones),
    address1: text(address?.street) || text(address?.address),
    address2: '',
    city: text(address?.city),
    state: text(address?.state),
    postal: text(address?.code) || text(address?.postal) || text(address?.zip),
    country: text(address?.country),
    occupation: customValue(row, ['occupation']),
    employer: customValue(row, ['employer']),
  }
}

export async function findPeopleByClientId(clientId: string): Promise<WorksheetPerson[]> {
  const searched = clientId.trim()
  if (!searched) return []
  const clientField = await resolveClientIdField()
  const params = new URLSearchParams({
    [clientField]: searched,
    limit: '5',
    fields: `${PERSON_FIELDS},${clientField}`,
  })
  const result = await fubApiFetch(`/people?${params.toString()}`)
  if (!result.ok) {
    throw new Error(fubError(result.json, 'Follow Up Boss could not look up that Client ID.'))
  }
  const body = result.json as { people?: unknown }
  const rows = Array.isArray(body.people) ? body.people : []
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => toPerson(row, clientField, searched))
    .filter((person) => person.id)
}
