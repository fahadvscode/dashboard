import { constantContactFetch, constantContactWrite } from '@/lib/constantContact'
import { accountProfile, isCampaignId } from '@/lib/constantContactReport'
import type { ReportAccountId } from '@/lib/constantContactReportTypes'

const TIME_ZONE = 'America/Toronto'

export type SavedDraft = {
  id: string
  name: string
  updatedAt: string
}

export type ContactListChoice = {
  id: string
  name: string
  count: number | null
}

export type SavedDraftDetail = {
  id: string
  name: string
  subject: string
  listIds: string[]
  lists: ContactListChoice[]
}

type CampaignRow = {
  campaign_id?: string
  name?: string
  current_status?: string
  updated_at?: string
}

type Activity = Record<string, unknown>

function nextHref(body: Record<string, unknown>) {
  const links = body._links as { next?: { href?: string } } | undefined
  return links?.next?.href || ''
}

async function assertAccount(account: ReportAccountId) {
  const profile = accountProfile(account)
  const summary = await constantContactFetch('/account/summary', account)
  if (String(summary.contact_email || '').toLowerCase() !== profile.email) {
    throw new Error(`${profile.name} is not the account that is connected.`)
  }
  return profile
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export async function listSavedDrafts(account: ReportAccountId) {
  const profile = await assertAccount(account)
  const drafts: SavedDraft[] = []
  let next = '/emails?limit=50'
  let stoppedEarly = false
  for (let guard = 0; next && guard < 20; guard += 1) {
    const page = await constantContactFetch(next, account)
    const campaigns = (page.campaigns as CampaignRow[] | undefined) || []
    for (const campaign of campaigns) {
      if (!campaign.campaign_id) continue
      if (String(campaign.current_status || '').toLowerCase() !== 'draft') continue
      drafts.push({
        id: campaign.campaign_id,
        name: campaign.name || 'Untitled draft',
        updatedAt: campaign.updated_at || '',
      })
    }
    const following = nextHref(page)
    if (!following) {
      next = ''
      break
    }
    if (guard === 19) {
      stoppedEarly = true
      next = ''
      break
    }
    next = following
  }
  drafts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '') || a.name.localeCompare(b.name))
  return { name: profile.name, drafts, stoppedEarly }
}

async function contactLists(account: ReportAccountId) {
  const lists: ContactListChoice[] = []
  let next = '/contact_lists?limit=1000'
  for (let guard = 0; next && guard < 10; guard += 1) {
    const page = await constantContactFetch(next, account)
    const rows = (page.lists as { list_id?: string; name?: string; membership_count?: number }[] | undefined) || []
    for (const row of rows) {
      if (!row.list_id) continue
      lists.push({
        id: row.list_id,
        name: row.name || 'Untitled list',
        count: typeof row.membership_count === 'number' ? row.membership_count : null,
      })
    }
    next = nextHref(page)
  }
  lists.sort((a, b) => a.name.localeCompare(b.name))
  return lists
}

async function primaryActivity(account: ReportAccountId, campaignId: string) {
  const detail = await constantContactFetch(`/emails/${campaignId}`, account)
  const status = String(detail.current_status || '').toLowerCase()
  if (status && status !== 'draft') throw new Error('This draft was already sent or scheduled.')
  const activities = (detail.campaign_activities as { campaign_activity_id?: string; role?: string }[] | undefined) || []
  const activityId = activities.find((activity) => activity.role === 'primary_email')?.campaign_activity_id
  if (!activityId) throw new Error('This draft has no email to send.')
  const activity = asRecord(await constantContactFetch(`/emails/activities/${activityId}`, account))
  if (!activity) throw new Error('This draft has no email to send.')
  const activityStatus = String(activity.current_status || '').toLowerCase()
  if (activityStatus && activityStatus !== 'draft') throw new Error('This draft was already sent or scheduled.')
  return { name: String(detail.name || 'Untitled draft'), activity }
}

export async function readSavedDraft(account: ReportAccountId, campaignId: string): Promise<SavedDraftDetail> {
  if (!isCampaignId(campaignId)) throw new Error('Choose a draft.')
  await assertAccount(account)
  const [{ name, activity }, lists] = await Promise.all([
    primaryActivity(account, campaignId),
    contactLists(account),
  ])
  const selected = Array.isArray(activity.contact_list_ids) ? activity.contact_list_ids.map(String) : []
  const known = new Set(lists.map((list) => list.id))
  return {
    id: campaignId,
    name,
    subject: String(activity.subject || ''),
    listIds: selected.filter((id) => known.has(id)),
    lists,
  }
}

function torontoDateTimeToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('Choose a date and time.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new Error('Choose a date and time.')
  }
  const desired = Date.UTC(year, month - 1, day, hour, minute)
  let utc = desired
  for (let pass = 0; pass < 3; pass += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utc))
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    const shown = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'))
    const delta = shown - desired
    if (delta === 0) break
    utc -= delta
  }
  if (utc <= Date.now() + 60_000) throw new Error('Pick a time that is still ahead.')
  return new Date(utc).toISOString()
}

function activityUpdate(activity: Activity, subject: string, listIds: string[]) {
  const fromName = String(activity.from_name || '').trim()
  const fromEmail = String(activity.from_email || '').trim()
  const replyTo = String(activity.reply_to_email || '').trim()
  if (!fromName || !fromEmail || !replyTo) throw new Error('This draft is missing the from address.')
  const body: Record<string, unknown> = { ...activity }
  delete body.html_content
  delete body.physical_address_in_footer
  delete body.document_properties
  delete body.permalink_url
  body.from_name = fromName
  body.from_email = fromEmail
  body.reply_to_email = replyTo
  body.subject = subject
  body.contact_list_ids = listIds
  body.segment_ids = []
  return body
}

export async function launchSavedDraft(
  account: ReportAccountId,
  input: { campaignId: string; subject: string; listIds: string[]; mode: 'now' | 'schedule'; at?: string }
) {
  if (!isCampaignId(input.campaignId)) throw new Error('Choose a draft.')
  const subject = input.subject.trim()
  if (!subject) throw new Error('Enter a subject line.')
  if (subject.length > 250) throw new Error('The subject line is too long.')
  const requested = [...new Set(input.listIds.map((id) => id.trim()).filter(Boolean))]
  if (requested.length === 0) throw new Error('Choose at least one list.')

  await assertAccount(account)
  const lists = await contactLists(account)
  const known = new Set(lists.map((list) => list.id))
  const listIds = requested.filter((id) => known.has(id))
  if (listIds.length !== requested.length) throw new Error('One of the lists is no longer in this account.')

  const { activity } = await primaryActivity(account, input.campaignId)
  const activityId = String(activity.campaign_activity_id || '')
  if (!activityId) throw new Error('This draft has no email to send.')

  const when = input.mode === 'schedule' ? torontoDateTimeToIso(input.at || '') : null
  await constantContactWrite(
    `/emails/activities/${activityId}`,
    account,
    'PUT',
    activityUpdate(activity, subject, listIds)
  )
  await constantContactWrite(
    `/emails/activities/${activityId}/schedules`,
    account,
    'POST',
    { scheduled_date: when || '0' }
  )
  return { mode: input.mode, when }
}
