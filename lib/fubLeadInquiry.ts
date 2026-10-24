import { fubApiFetch, getFubApiKey, listFubUsers } from '@/lib/fubApi'
import { FOLLOW_UP_ASSIGNEES, matchFubAssignee } from '@/lib/followUpTasks'

const OFFICE_USER_ID = 3
const OFFICE_ASSIGNEE = 'Fahad Javed Office'

function cell(row: string[], index: number) {
  return String(row[index] ?? '').trim()
}

function tagsFor(source: string, projectId: string, company: string, tagCell: string) {
  const tags: string[] = []
  for (const part of [source, projectId, company, ...tagCell.split(',')]) {
    const tag = part.trim()
    if (!tag || tags.includes(tag)) continue
    tags.push(tag)
  }
  return tags
}

/** Same Follow Up Boss Property Inquiry the sheet Zap created from columns A–M. */
export function sheetRowToFubEvent(row: string[]) {
  const source = cell(row, 4) || 'N/A'
  const projectId = cell(row, 5) || 'N/A'
  const landing = cell(row, 6) || 'N/A'
  const company = cell(row, 7) || 'N/A'
  const broker = cell(row, 10) || 'N/A'
  const message = cell(row, 12)
  const email = cell(row, 2)
  const phone = cell(row, 3)
  const dashSource = `Dashboard.${source}`
  const description = [
    `Interested in project:${source}`,
    `Project Id: ${projectId}`,
    `Project landing page: ${landing}`,
    `Company: ${source}`,
    `message: ${message}`,
  ].join('\n')

  const person: Record<string, unknown> = {
    firstName: cell(row, 0),
    lastName: cell(row, 1),
    source: dashSource,
    tags: tagsFor(source, projectId, company, cell(row, 9)),
    customWebsite: company,
    customAreYouARealtor: broker,
  }
  if (email && email.toUpperCase() !== 'N/A') person.emails = [{ value: email }]
  if (phone && phone.toUpperCase() !== 'N/A') person.phones = [{ value: phone }]

  return {
    source: dashSource,
    system: 'Dashboard',
    type: 'Property Inquiry',
    message: description,
    person,
    campaign: { source: dashSource },
  }
}

async function officeAssignee() {
  try {
    const users = await listFubUsers()
    const byId = users.find((user) => user.id === OFFICE_USER_ID)
    if (byId) return { name: byId.name, id: byId.id }
    const matched = matchFubAssignee(users, { name: OFFICE_ASSIGNEE }) || matchFubAssignee(users, { name: FOLLOW_UP_ASSIGNEES[1] })
    if (matched) return { name: matched.name, id: matched.id }
  } catch (error) {
    console.error('Could not look up Fahad Javed Office:', error)
  }
  return { name: OFFICE_ASSIGNEE, id: OFFICE_USER_ID }
}

function personIdFromPayload(json: unknown): string {
  const body = json as {
    personId?: number | string
    id?: number | string
    person?: { id?: number | string }
    people?: Array<{ id?: number | string }>
  }
  const raw = body.personId ?? body.person?.id ?? body.people?.[0]?.id
  const id = typeof raw === 'number' ? raw : Number(String(raw || '').trim())
  return Number.isFinite(id) && id > 0 ? String(id) : ''
}

async function findPersonId(email: string, phone: string) {
  if (email && email.toUpperCase() !== 'N/A') {
    const found = await fubApiFetch(`/people?email=${encodeURIComponent(email)}&limit=1&fields=id`)
    const id = personIdFromPayload(found.json)
    if (id) return id
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 7) {
    const found = await fubApiFetch(`/people?phone=${encodeURIComponent(digits)}&limit=1&fields=id`)
    return personIdFromPayload(found.json)
  }
  return ''
}

async function assignPersonToOffice(personId: string, assignee: { name: string; id: number | null }) {
  const payload: Record<string, unknown> = { assignedTo: assignee.name }
  if (assignee.id) payload.assignedUserId = assignee.id
  let saved = await fubApiFetch(`/people/${encodeURIComponent(personId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!saved.ok && assignee.id) {
    saved = await fubApiFetch(`/people/${encodeURIComponent(personId)}`, {
      method: 'PUT',
      body: JSON.stringify({ assignedUserId: assignee.id }),
    })
  }
  return saved.ok
}

export async function sendSheetRowToFollowUpBoss(row: string[], options?: { assignToOffice?: boolean }) {
  if (!getFubApiKey()) {
    return { ok: false, skipped: true, status: 0, error: 'FUB_API_KEY is not set.', assigned: false }
  }
  const email = cell(row, 2)
  const phone = cell(row, 3)
  if ((!email || email.toUpperCase() === 'N/A') && (!phone || phone.toUpperCase() === 'N/A')) {
    return { ok: false, skipped: true, status: 0, error: 'Lead has no email or phone.', assigned: false }
  }

  const event = sheetRowToFubEvent(row)
  const assignee = options?.assignToOffice ? await officeAssignee() : null
  if (assignee) {
    event.person.assignedTo = assignee.name
    if (assignee.id) event.person.assignedUserId = assignee.id
  }

  const result = await fubApiFetch('/events', {
    method: 'POST',
    body: JSON.stringify(event),
  })
  const body = result.json as { id?: number; personId?: number; errorMessage?: string; message?: string; error?: string }
  let assigned = false
  if (result.ok && assignee) {
    try {
      const personId = personIdFromPayload(result.json) || (await findPersonId(email, phone))
      if (personId) assigned = await assignPersonToOffice(personId, assignee)
    } catch (error) {
      console.error('Could not assign lead to Fahad Javed office:', error)
    }
  }
  return {
    ok: result.ok,
    skipped: false,
    status: result.status,
    personId: body.personId || body.id,
    assigned,
    error: result.ok ? undefined : body.errorMessage || body.message || body.error,
  }
}
