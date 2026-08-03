import { resolveCustomerNotes } from '@/lib/customerNotes'
import { formatLeadSheetTimestamp } from '@/lib/leadGoogleSheets'

export const PRECON_FACTORY_WEBSITE_BASE_URL = 'https://www.preconfactory.com'

export function resolvePreconFactoryWebsiteInterested(lead: Record<string, unknown>): string {
  const parts = [lead.interested_in, lead.budget, lead.timeline]
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
  return parts.length ? parts.map(String).join(' · ') : 'N/A'
}

export function resolvePreconFactoryWebsiteLandingPage(lead: Record<string, unknown>): string {
  const redirect = typeof lead.redirect_link === 'string' ? lead.redirect_link.trim() : ''
  if (redirect) return redirect
  const projectId = typeof lead.project_id === 'string' ? lead.project_id.trim() : ''
  if (projectId) return `${PRECON_FACTORY_WEBSITE_BASE_URL}/projects/${projectId}`
  return PRECON_FACTORY_WEBSITE_BASE_URL
}

export function resolvePreconFactoryWebsiteSheetTag(lead: Record<string, unknown>): string {
  const parts = ['Precon Factory Website']
  const source = typeof lead.source === 'string' ? lead.source.trim() : ''
  if (source) parts.push(source)
  if (lead.isagent) parts.push('realtor')
  return parts.join(', ')
}

function formatIsAgentBrokerSheetValue(lead: Record<string, unknown>): 'Yes' | 'No' {
  return lead.isagent ? 'Yes' : 'No'
}

/** One row for Sheet1 columns A–M (same shape as /api/leads/notify append). */
export function buildPreconFactoryWebsiteLeadSheetRow(lead: Record<string, unknown>): string[] {
  const firstName =
    (lead.firstname as string) ||
    (lead.first_name as string) ||
    ((lead.full_name as string) || '').split(' ')[0] ||
    'N/A'
  const lastName =
    (lead.lastname as string) ||
    (lead.last_name as string) ||
    ((lead.full_name as string) || '').split(' ').slice(1).join(' ') ||
    'N/A'

  const projectName = (lead.project_name as string) || (lead.source as string) || 'N/A'
  const projectId = (lead.project_id as string) || 'N/A'
  const landingPage = resolvePreconFactoryWebsiteLandingPage(lead)
  const tag = resolvePreconFactoryWebsiteSheetTag(lead)
  const broker = formatIsAgentBrokerSheetValue(lead)
  const interested = resolvePreconFactoryWebsiteInterested(lead)
  const sheetMessage = resolveCustomerNotes(lead)

  return [
    firstName,
    lastName,
    (lead.email as string) || 'N/A',
    (lead.phone as string) || 'N/A',
    projectName,
    projectId,
    landingPage,
    'Precon Factory Website',
    formatLeadSheetTimestamp(lead.created_at),
    tag,
    broker,
    interested,
    sheetMessage,
  ]
}

/** Dedupe key: email + project id + sheet timestamp (matches backfill rows). */
export function preconFactoryWebsiteSheetDedupeKey(row: string[]): string {
  const email = (row[2] || '').trim().toLowerCase()
  const projectId = (row[5] || '').trim()
  const timestamp = (row[8] || '').trim()
  return `${email}|${projectId}|${timestamp}`
}
