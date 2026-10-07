import { fubApiFetch, getFubApiKey } from '@/lib/fubApi'

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

export async function sendSheetRowToFollowUpBoss(row: string[]) {
  if (!getFubApiKey()) {
    return { ok: false, skipped: true, status: 0, error: 'FUB_API_KEY is not set.' }
  }
  const email = cell(row, 2)
  const phone = cell(row, 3)
  if ((!email || email.toUpperCase() === 'N/A') && (!phone || phone.toUpperCase() === 'N/A')) {
    return { ok: false, skipped: true, status: 0, error: 'Lead has no email or phone.' }
  }

  const result = await fubApiFetch('/events', {
    method: 'POST',
    body: JSON.stringify(sheetRowToFubEvent(row)),
  })
  const body = result.json as { id?: number; errorMessage?: string; message?: string; error?: string }
  return {
    ok: result.ok,
    skipped: false,
    status: result.status,
    personId: body.id,
    error: result.ok ? undefined : body.errorMessage || body.message || body.error,
  }
}
