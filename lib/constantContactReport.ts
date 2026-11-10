import { fetchAllRows, getSupabaseAdmin } from '@/lib/supabase'
import { constantContactFetch } from '@/lib/constantContact'
import type { AccountReport, ReportAccountId, ReportCampaign } from '@/lib/constantContactReportTypes'

const TIME_ZONE = 'America/Toronto'

const ACCOUNTS: Record<ReportAccountId, { name: string; email: string; tables: string[] }> = {
  primary: {
    name: 'Fahad Javed Real Estate',
    email: 'fahad@fahadsold.com',
    tables: ['fj_leads'],
  },
  second: {
    name: 'Precon Factory',
    email: 'setuppreconfactory@gmail.com',
    tables: ['precon_factory_leads', 'precon_factory_website_leads'],
  },
  third: {
    name: 'GTA Lowrise',
    email: 'gtalowrise01@gmail.com',
    tables: ['gta_lowrise_leads'],
  },
}

type EmailCampaign = {
  campaign_id?: string
  name?: string
  current_status?: string
}

type SummaryRow = {
  campaign_id?: string
  last_sent_date?: string
  unique_counts?: {
    sends?: number | string
    opens?: number | string
    clicks?: number | string
    optouts?: number | string
    bounces?: number | string
  }
}

type LeadRow = {
  id?: string
  project_name?: string | null
  source?: string | null
  redirect_link?: string | null
  created_at?: string | null
  project_id?: string | null
}

export function torontoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function isReportDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function reportAccount(id: string): ReportAccountId | null {
  if (id === 'primary' || id === 'second' || id === 'third') return id
  return null
}

export function accountProfile(account: ReportAccountId) {
  return { name: ACCOUNTS[account].name, email: ACCOUNTS[account].email }
}

function torontoParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return { day: `${read('year')}-${read('month')}-${read('day')}`, hour: Number(read('hour')), minute: read('minute') }
}

function torontoDay(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return torontoParts(date).day
}

function torontoClock(iso: string | null | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const { hour, minute } = torontoParts(date)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minute} ${suffix}`
}

function dayStart(day: string) {
  for (const offset of ['-05:00', '-04:00']) {
    const date = new Date(`${day}T00:00:00${offset}`)
    const parts = torontoParts(date)
    if (parts.day === day && parts.hour === 0) return date
  }
  return new Date(`${day}T05:00:00Z`)
}

function nextHref(body: Record<string, unknown>) {
  const links = body._links as { next?: { href?: string } } | undefined
  return links?.next?.href || ''
}

async function pages(account: ReportAccountId, path: string) {
  const rows: Record<string, unknown>[] = []
  let next = path
  for (let guard = 0; next && guard < 40; guard += 1) {
    const body = await constantContactFetch(next, account)
    rows.push(body)
    next = nextHref(body)
  }
  return rows
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Could not read this account.'
}

function count(value: number | string | undefined) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function rate(part: number, whole: number) {
  if (whole <= 0) return null
  return Math.round((part / whole) * 1000) / 10
}

function pageName(lead: LeadRow, key: string) {
  const name = String(lead.project_name || lead.source || '').trim()
  return name || key
}

async function leadsForDay(tables: string[], day: string) {
  const start = dayStart(day)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  const supabase = getSupabaseAdmin()
  const leads: LeadRow[] = []
  for (const table of tables) {
    const load = (columns: string) =>
      fetchAllRows<LeadRow>((from, to) =>
        supabase
          .from(table)
          .select(columns)
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString())
          .order('id', { ascending: true })
          .range(from, to)
      )
    let rows: LeadRow[]
    try {
      rows = await load('id, project_name, source, redirect_link, project_id, created_at')
    } catch (error) {
      const message = errorMessage(error)
      if (!/redirect_link|project_id/i.test(message)) throw error
      rows = await load('id, project_name, source, project_id, created_at')
      for (const row of rows) {
        const projectId = String(row.project_id || '').trim()
        if (!row.redirect_link && projectId) {
          row.redirect_link = `https://www.preconfactory.com/projects/${projectId}`
        }
      }
    }
    leads.push(...rows)
  }
  return leads
}

function registrationProjects(links: string[]) {
  const projects = new Map<string, string>()
  for (const raw of links) {
    const value = String(raw || '').trim()
    if (!value) continue
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
      const id = (url.searchParams.get('project_id') || url.searchParams.get('projectId') || '').trim()
      if (!id) continue
      const name = (url.searchParams.get('project') || '').replace(/\+/g, ' ').trim()
      if (!projects.has(id)) projects.set(id, name)
    } catch {
      continue
    }
  }
  return projects
}

function leadProjectId(lead: LeadRow) {
  const direct = String(lead.project_id || '').trim()
  if (direct) return direct
  const value = String(lead.redirect_link || '').trim()
  if (!value) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return (url.searchParams.get('project_id') || url.searchParams.get('projectId') || '').trim()
  } catch {
    return ''
  }
}

function signupResult(pages: Map<string, number>) {
  const list = [...pages.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return {
    total: list.reduce((sum, page) => sum + page.count, 0),
    pages: list,
  }
}

function assignSignups(drafts: { id: string; links: string[] }[], leads: LeadRow[]) {
  const pagesById = new Map(drafts.map((draft) => [draft.id, new Map<string, number>()]))

  for (const draft of drafts) {
    const projects = registrationProjects(draft.links)
    const used = new Set<string>()
    const pages = pagesById.get(draft.id)
    if (!pages || projects.size === 0) continue
    for (const lead of leads) {
      const projectId = leadProjectId(lead)
      if (!projectId || !projects.has(projectId)) continue
      const leadId = String(lead.id || '')
      if (leadId && used.has(leadId)) continue
      if (leadId) used.add(leadId)
      const name = projects.get(projectId) || pageName(lead, projectId)
      pages.set(name, (pages.get(name) || 0) + 1)
    }
  }

  return pagesById
}

const CAMPAIGN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isCampaignId(value: string) {
  return CAMPAIGN_ID.test(value)
}

export async function getCampaignDesign(account: ReportAccountId, campaignId: string) {
  if (!isCampaignId(campaignId)) throw new Error('Choose an email.')
  const detail = await constantContactFetch(`/emails/${campaignId}`, account)
  const activities = (detail.campaign_activities as { campaign_activity_id?: string; role?: string }[] | undefined) || []
  const permalinkId = activities.find((activity) => activity.role === 'permalink')?.campaign_activity_id
  const primaryId = activities.find((activity) => activity.role === 'primary_email')?.campaign_activity_id
  const linkActivityId = permalinkId || primaryId
  const previewActivityId = primaryId || permalinkId
  if (!linkActivityId && !previewActivityId) throw new Error('This email has no design yet.')

  let permalinkUrl = ''
  let subject = ''
  if (linkActivityId) {
    try {
      const activity = await constantContactFetch(`/emails/activities/${linkActivityId}?include=permalink_url`, account)
      permalinkUrl = String(activity.permalink_url || '')
      subject = String(activity.subject || '')
    } catch {
      permalinkUrl = ''
    }
  }

  let previewHtml = ''
  if (previewActivityId) {
    try {
      const preview = await constantContactFetch(`/emails/activities/${previewActivityId}/previews`, account)
      previewHtml = String(preview.preview_html_content || '')
      if (!subject) subject = String(preview.subject || '')
    } catch {
      previewHtml = ''
    }
  }

  if (!permalinkUrl && !previewHtml) throw new Error('This email has no design or link yet.')
  return {
    name: String(detail.name || 'Email'),
    subject,
    permalinkUrl,
    previewHtml,
  }
}

async function campaignActivities(account: ReportAccountId, campaignId: string) {
  const detail = await constantContactFetch(`/emails/${campaignId}`, account)
  const activities = (detail.campaign_activities as { campaign_activity_id?: string; role?: string }[] | undefined) || []
  return activities.filter((activity) => activity.role === 'primary_email' || activity.role === 'resend')
}

async function campaignLinks(account: ReportAccountId, campaignId: string) {
  const activities = await campaignActivities(account, campaignId)
  const links: string[] = []
  for (const activity of activities) {
    if (!activity.campaign_activity_id) continue
    const report = await constantContactFetch(
      `/reports/email_reports/${activity.campaign_activity_id}/links`,
      account
    )
    const rows = (report.link_click_counts as { link_url?: string }[] | undefined) || []
    for (const row of rows) {
      if (row.link_url) links.push(row.link_url)
    }
  }
  return links
}

async function scheduledWhen(account: ReportAccountId, campaignId: string) {
  const activities = await campaignActivities(account, campaignId)
  for (const activity of activities) {
    if (activity.role !== 'primary_email' || !activity.campaign_activity_id) continue
    const body = await constantContactFetch(`/emails/activities/${activity.campaign_activity_id}/schedules`, account)
    const schedules = (Array.isArray(body) ? body : []) as { scheduled_date?: string }[]
    const date = schedules.find((row) => row.scheduled_date)?.scheduled_date || ''
    if (date) return date
  }
  return ''
}

const SIGNUP_LIST: Record<ReportAccountId, string> = {
  primary: 'FJ leads',
  second: 'Precon Factory leads',
  third: 'GTA Lowrise leads',
}

export type ReportProgress = { step: 2 | 3 | 4 | 5; message: string }

export async function buildAccountReport(
  account: ReportAccountId,
  day: string,
  onProgress?: (progress: ReportProgress) => void
): Promise<AccountReport> {
  const config = ACCOUNTS[account]
  const report: AccountReport = { id: account, name: config.name, campaigns: [], error: null }
  try {
    onProgress?.({ step: 2, message: `Reading ${config.name}` })
    const summary = await constantContactFetch('/account/summary', account)
    if (String(summary.contact_email || '').toLowerCase() !== config.email) {
      throw new Error(`${config.name} is not the account that is connected.`)
    }

    const emailPages = await pages(account, '/emails?limit=50')
    const emails = new Map<string, EmailCampaign>()
    for (const page of emailPages) {
      for (const campaign of (page.campaigns as EmailCampaign[] | undefined) || []) {
        if (campaign.campaign_id) emails.set(campaign.campaign_id, campaign)
      }
    }

    const sent = new Map<string, SummaryRow>()
    let summaryPath = '/reports/summary_reports/email_campaign_summaries?limit=500'
    for (let guard = 0; summaryPath && guard < 20; guard += 1) {
      const page = await constantContactFetch(summaryPath, account)
      const rows = (page.bulk_email_campaign_summaries as SummaryRow[] | undefined) || []
      let olderThanDay = false
      for (const row of rows) {
        if (!row.campaign_id || !row.last_sent_date) continue
        const sentDay = torontoDay(row.last_sent_date)
        if (sentDay === day) sent.set(row.campaign_id, row)
        if (sentDay && sentDay < day) olderThanDay = true
      }
      if (olderThanDay) break
      summaryPath = nextHref(page)
    }

    const campaigns: ReportCampaign[] = []
    const sentDrafts: { id: string; name: string; whenIso: string; openRate: number | null; clickRate: number | null; unsubscribed: number; bounced: number; links: string[] }[] = []

    onProgress?.({ step: 3, message: `Filling the sent emails for ${config.name}` })
    for (const [id, row] of sent) {
      const counts = row.unique_counts || {}
      const sends = count(counts.sends)
      const opens = count(counts.opens)
      const clicks = count(counts.clicks)
      let links: string[] = []
      try {
        links = await campaignLinks(account, id)
      } catch {
        links = []
      }
      sentDrafts.push({
        id,
        name: emails.get(id)?.name || 'Email',
        whenIso: row.last_sent_date || '',
        openRate: rate(opens, sends),
        clickRate: rate(clicks, sends),
        unsubscribed: count(counts.optouts),
        bounced: count(counts.bounces),
        links,
      })
    }

    onProgress?.({ step: 4, message: `Counting signups from ${SIGNUP_LIST[account]}` })
    const leads = sentDrafts.length ? await leadsForDay(config.tables, day) : []
    const signups = assignSignups(sentDrafts, leads)
    for (const draft of sentDrafts) {
      campaigns.push({
        id: draft.id,
        name: draft.name,
        status: 'sent',
        when: draft.whenIso,
        openRate: draft.openRate,
        clickRate: draft.clickRate,
        unsubscribed: draft.unsubscribed,
        bounced: draft.bounced,
        signups: signupResult(signups.get(draft.id) || new Map()),
      })
    }

    onProgress?.({ step: 5, message: `Showing what is still scheduled for ${config.name}` })
    for (const [id, email] of emails) {
      const status = String(email.current_status || '').toLowerCase()
      if (status !== 'scheduled' && status !== 'executing') continue
      if (status === 'executing' && day !== torontoToday()) continue
      const whenIso = status === 'scheduled' ? await scheduledWhen(account, id) : ''
      if (status === 'scheduled' && torontoDay(whenIso) !== day) continue
      campaigns.push({
        id,
        name: email.name || 'Email',
        status: status === 'scheduled' ? 'scheduled' : 'sending',
        when: whenIso,
        openRate: null,
        clickRate: null,
        unsubscribed: null,
        bounced: null,
        signups: null,
      })
    }

    campaigns.sort((a, b) => {
      const order = { sent: 0, sending: 1, scheduled: 2 }
      return order[a.status] - order[b.status] || (a.when || '').localeCompare(b.when || '') || a.name.localeCompare(b.name)
    })
    for (const campaign of campaigns) {
      campaign.when = torontoClock(campaign.when)
    }
    report.campaigns = campaigns
  } catch (error) {
    const message = errorMessage(error)
    report.error = /not set|needs to be connected|invalid_grant|unauthorized/i.test(message)
      ? `${config.name} needs to be connected again.`
      : message
  }
  return report
}
