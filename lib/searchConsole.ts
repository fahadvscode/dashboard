import { createClient } from '@supabase/supabase-js'
import { fetchLandingPageSources, type LandingPageSource } from '@/lib/landingPageSources'
import { getSupabaseAdmin } from '@/lib/supabase'

export const SEARCH_CONSOLE_TOKEN_TYPE = 'search_console'
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export const DEFAULT_SEARCH_CONSOLE_REDIRECT_URI =
  'https://property-dashboard-three.vercel.app/api/search-console/oauth-callback'

export const SEARCH_CONSOLE_ALL_SITES = 'all'

export type SearchConsoleStatus = 'working' | 'improve' | 'not_converting' | 'hidden'

export type SearchConsolePageInsight = {
  page: string
  title: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  leads: number
  landingPageName: string | null
  landingPageTable: string | null
  status: SearchConsoleStatus
  statusLabel: string
  why: string
  indexIssue: string | null
}

export type SearchConsoleLandingComparison = {
  name: string
  projectName: string
  table: string
  siteUrl: string
  page: string | null
  pathLabel: string
  leads: number
  clicks: number
  impressions: number
  ctr: number
  googlePages: number
  status: SearchConsoleStatus
  statusLabel: string
  why: string
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database is not configured.')
  }
  return createClient(supabaseUrl, supabaseKey)
}

/** Separate Google login from Calendar. Uses GSC client env if set, otherwise the same Cloud app with an account picker. */
export function getSearchConsoleRedirectUri() {
  return process.env.GOOGLE_SEARCH_CONSOLE_REDIRECT_URI || DEFAULT_SEARCH_CONSOLE_REDIRECT_URI
}

export function getSearchConsoleOAuthClient(redirectUri?: string) {
  const { google } = require('googleapis') as typeof import('googleapis')
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Search Console Google OAuth client is not configured.')
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri || getSearchConsoleRedirectUri()
  )
}

export async function getSearchConsoleClient() {
  const { google } = await import('googleapis')
  const supabase = getSupabase()
  const oauth2Client = getSearchConsoleOAuthClient()

  const { data: tokenData, error } = await supabase
    .from('calendar_tokens')
    .select('*')
    .eq('calendar_type', SEARCH_CONSOLE_TOKEN_TYPE)
    .maybeSingle()

  if (error || !tokenData?.refresh_token) {
    throw new Error('Search Console is not connected.')
  }

  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  })

  if (tokenData.expiry_date && Number(tokenData.expiry_date) <= Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await supabase
      .from('calendar_tokens')
      .update({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        updated_at: new Date().toISOString(),
      })
      .eq('calendar_type', SEARCH_CONSOLE_TOKEN_TYPE)
    oauth2Client.setCredentials(credentials)
  }

  return google.searchconsole({ version: 'v1', auth: oauth2Client })
}

export async function isSearchConsoleConnected() {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('calendar_tokens')
      .select('calendar_type')
      .eq('calendar_type', SEARCH_CONSOLE_TOKEN_TYPE)
      .maybeSingle()
    return Boolean(data)
  } catch {
    return false
  }
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function getSearchConsoleDateRange() {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 2)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

function sumRows(rows: Array<{ clicks?: number | null; impressions?: number | null; position?: number | null }> | undefined) {
  const list = rows || []
  const clicks = list.reduce((sum, row) => sum + (row.clicks || 0), 0)
  const impressions = list.reduce((sum, row) => sum + (row.impressions || 0), 0)
  const ctr = impressions ? clicks / impressions : 0
  const position =
    impressions > 0
      ? list.reduce((sum, row) => sum + (row.position || 0) * (row.impressions || 0), 0) / impressions
      : 0
  return { clicks, impressions, ctr, position }
}

function emptyStats(
  sites: Array<{ siteUrl: string; permissionLevel: string }>,
  summary: string,
  selectedSite: string | null = null
) {
  return {
    connected: true as const,
    sites,
    selectedSite,
    range: getSearchConsoleDateRange(),
    totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    queries: [] as Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>,
    topWorking: [] as SearchConsolePageInsight[],
    topClicks: [] as SearchConsolePageInsight[],
    topViews: [] as SearchConsolePageInsight[],
    needsWork: [] as SearchConsolePageInsight[],
    landingComparison: [] as SearchConsoleLandingComparison[],
    summary,
  }
}

function pickSitesToQuery(
  sites: Array<{ siteUrl: string; permissionLevel: string }>,
  requestedSiteUrl: string | undefined,
  landingSources: LandingPageSource[]
) {
  if (requestedSiteUrl && requestedSiteUrl !== SEARCH_CONSOLE_ALL_SITES) {
    const found = sites.find((site) => site.siteUrl === requestedSiteUrl)
    return found ? [found] : [sites[0]]
  }

  const matched = sites.filter((site) =>
    landingSources.some((source) => gscSiteMatchesLanding(site.siteUrl, source))
  )
  const list = matched.length > 0 ? matched : sites
  return list.slice(0, 20)
}

export async function fetchSearchConsoleStats(requestedSiteUrl?: string) {
  const searchconsole = await getSearchConsoleClient()
  const { data: sitesData } = await searchconsole.sites.list()
  const sites = (sitesData.siteEntry || [])
    .map((site) => ({
      siteUrl: site.siteUrl || '',
      permissionLevel: site.permissionLevel || '',
    }))
    .filter((site) => site.siteUrl)

  if (sites.length === 0) {
    return emptyStats(sites, 'No Search Console sites are connected to this Google account.')
  }

  const landingSources = await fetchLandingPageSources({ enabledOnly: true }).catch(
    () => [] as LandingPageSource[]
  )
  const envSite = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  const preferred =
    requestedSiteUrl ||
    (envSite && envSite !== SEARCH_CONSOLE_ALL_SITES ? envSite : SEARCH_CONSOLE_ALL_SITES)
  const sitesToQuery = pickSitesToQuery(sites, preferred, landingSources)
  const viewingAll = sitesToQuery.length > 1
  const selectedSite = viewingAll ? SEARCH_CONSOLE_ALL_SITES : sitesToQuery[0].siteUrl
  const { startDate, endDate } = getSearchConsoleDateRange()

  const siteReports = await Promise.all(
    sitesToQuery.map(async (site) => {
      try {
        const [totalsRes, pagesRes] = await Promise.all([
          searchconsole.searchanalytics.query({
            siteUrl: site.siteUrl,
            requestBody: { startDate, endDate, dataState: 'all' },
          }),
          searchconsole.searchanalytics.query({
            siteUrl: site.siteUrl,
            requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 100, dataState: 'all' },
          }),
        ])
        const totals = totalsRes.data.rows?.[0]
          ? {
              clicks: totalsRes.data.rows[0].clicks || 0,
              impressions: totalsRes.data.rows[0].impressions || 0,
              ctr: totalsRes.data.rows[0].ctr || 0,
              position: totalsRes.data.rows[0].position || 0,
            }
          : sumRows(totalsRes.data.rows)
        return {
          siteUrl: site.siteUrl,
          totals,
          pages: (pagesRes.data.rows || []).map((row) => ({
            page: row.keys?.[0] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          })),
        }
      } catch {
        return {
          siteUrl: site.siteUrl,
          totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
          pages: [] as Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>,
        }
      }
    })
  )

  const totals = sumRows(siteReports.map((report) => report.totals))
  const pageRows = siteReports.flatMap((report) => report.pages)
  const querySite =
    [...siteReports].sort((a, b) => b.totals.clicks - a.totals.clicks)[0]?.siteUrl || sitesToQuery[0].siteUrl

  const [queriesRes, leadRows] = await Promise.all([
    searchconsole.searchanalytics
      .query({
        siteUrl: querySite,
        requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 10, dataState: 'all' },
      })
      .catch(() => ({ data: { rows: [] as Array<{ keys?: string[]; clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }> } })),
    fetchLandingLeadRows(landingSources, startDate, endDate).catch(() => [] as ParsedLead[]),
  ])

  const { pageLeadCounts, unmatchedByTable } = attributeLeadsToPages(pageRows, landingSources, leadRows)

  const indexIssues = viewingAll
    ? new Map<string, string>()
    : await inspectProblemPages(searchconsole, selectedSite, pageRows).catch(() => new Map<string, string>())

  const pages = pageRows.map((row) =>
    buildPageInsight(
      row,
      landingSources,
      pageLeadCounts.get(row.page) || 0,
      unmatchedByTable,
      indexIssues.get(row.page) || null
    )
  )

  const topWorking = pages
    .filter((page) => page.status === 'working')
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 10)
  const topClicks = [...pages].sort((a, b) => b.clicks - a.clicks).slice(0, 10)
  const topViews = [...pages].sort((a, b) => b.impressions - a.impressions).slice(0, 10)
  const needsWork = pages
    .filter((page) => page.status !== 'working')
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
  const landingComparison = buildLandingComparison(landingSources, pages, unmatchedByTable)

  const best =
    landingComparison.find((row) => row.leads > 0) ||
    landingComparison.find((row) => row.clicks > 0) ||
    topWorking[0]
  const leaky =
    landingComparison.find((row) => row.status === 'not_converting') ||
    landingComparison.find((row) => row.status === 'improve' && row.impressions > 0) ||
    landingComparison.find((row) => row.status === 'hidden' && row.impressions > 0) ||
    needsWork[0]
  const bestName = best ? ('title' in best ? best.title : best.name) : ''
  const leakyName = leaky ? ('title' in leaky ? leaky.title : leaky.name) : ''
  const summary = [
    best
      ? `Best: ${bestName} — ${formatPlainNumber(best.clicks)} Google clicks and ${best.leads} leads.`
      : 'No page data yet for this date range.',
    leaky ? `Needs work: ${leakyName} — ${leaky.why}` : 'Nothing looks broken right now.',
  ].join(' ')

  return {
    connected: true as const,
    sites,
    selectedSite,
    range: { startDate, endDate },
    totals,
    queries: (queriesRes.data.rows || []).map((row) => ({
      query: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })),
    topWorking,
    topClicks,
    topViews,
    needsWork,
    landingComparison,
    summary,
  }
}

function formatPlainNumber(value: number) {
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value)
}

function hostnameOf(url: string) {
  const trimmed = (url || '').trim()
  if (trimmed.toLowerCase().startsWith('sc-domain:')) {
    return trimmed.slice('sc-domain:'.length).replace(/^www\./i, '').toLowerCase()
  }
  try {
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return new URL(full).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '').toLowerCase()
  }
}

function sitePathname(url: string) {
  try {
    const full = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const path = new URL(full).pathname.replace(/\/$/, '')
    return path === '/' ? '' : path
  } catch {
    return ''
  }
}

const SHARED_APP_HOSTS = new Set([
  'vercel.app',
  'netlify.app',
  'github.io',
  'web.app',
  'pages.dev',
  'herokuapp.com',
])

function gscSiteMatchesLanding(gscSiteUrl: string, source: LandingPageSource) {
  const site = source.site_url || ''
  if (!site) return false
  const gscHost = hostnameOf(gscSiteUrl)
  const sourceHost = hostnameOf(site)
  if (!gscHost || !sourceHost) return false
  if (SHARED_APP_HOSTS.has(gscHost) || SHARED_APP_HOSTS.has(sourceHost)) {
    return gscHost === sourceHost
  }
  return gscHost === sourceHost || sourceHost.endsWith(`.${gscHost}`) || gscHost.endsWith(`.${sourceHost}`)
}

function canonicalUrl(url: string) {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
}

function matchLandingSource(pageUrl: string, sources: LandingPageSource[]) {
  const pageHost = hostnameOf(pageUrl)
  const pageCanon = canonicalUrl(pageUrl)

  const prefixMatches = sources
    .filter((source) => {
      const siteCanon = canonicalUrl(source.site_url || '')
      if (!siteCanon) return false
      return pageCanon === siteCanon || pageCanon.startsWith(`${siteCanon}/`) || pageCanon.startsWith(`${siteCanon}?`)
    })
    .sort((a, b) => (b.site_url?.length || 0) - (a.site_url?.length || 0))
  if (prefixMatches[0]) return prefixMatches[0]

  return (
    sources.find((source) => {
      const site = source.site_url || ''
      if (!site || sitePathname(site)) return false
      return hostnameOf(site) === pageHost
    }) || null
  )
}

type ParsedLead = {
  table: string
  path: string | null
  slugs: string[]
}

const GENERIC_LEAD_SOURCES = new Set([
  'google',
  'facebook',
  'instagram',
  'direct',
  'organic',
  'cpc',
  'paid',
  'bing',
  'youtube',
  'tiktok',
  'unknown',
  'website',
  'other',
  'search',
  'gsc',
  'n/a',
  'na',
  '-',
])

const TRACKING_HOSTS = new Set([
  'google.com',
  'google.ca',
  'facebook.com',
  'l.facebook.com',
  'instagram.com',
  'bing.com',
  't.co',
  'youtube.com',
])

const LEAD_SELECTS = [
  'id, page_path, source_page, source, form_name, form_location',
  'id, source, form_name',
  'id',
]

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizePath(input: string) {
  let raw = input.trim()
  try {
    if (/^https?:\/\//i.test(raw)) {
      raw = new URL(raw).pathname
    }
  } catch {
    // keep as-is
  }
  raw = raw.split('?')[0].split('#')[0]
  if (!raw.startsWith('/')) raw = `/${raw}`
  if (raw.length > 1) raw = raw.replace(/\/+$/, '')
  return (raw || '/').toLowerCase()
}

function pathOfPage(pageUrl: string) {
  try {
    return normalizePath(new URL(pageUrl).pathname)
  } catch {
    return '/'
  }
}

function pathLabelOf(pageUrl: string | null) {
  if (!pageUrl) return 'other pages'
  const path = pathOfPage(pageUrl)
  return path === '/' ? 'home' : path
}

function parseLeadHints(lead: Record<string, unknown>, source: LandingPageSource): Omit<ParsedLead, 'table'> {
  const projectSlugs = new Set(
    [toSlug(source.display_name), toSlug(source.table_name), toSlug(source.page_name || '')].filter(
      (slug) => slug.length >= 3
    )
  )
  let path: string | null = null
  const slugs: string[] = []

  for (const key of ['page_path', 'source_page', 'source', 'form_location', 'form_name']) {
    const value = String(lead[key] ?? '').trim()
    if (!value) continue
    if (GENERIC_LEAD_SOURCES.has(value.toLowerCase())) continue

    if (/^https?:\/\//i.test(value) || value.startsWith('/') || (value.includes('/') && value.includes('.'))) {
      try {
        if (/^https?:\/\//i.test(value) && TRACKING_HOSTS.has(hostnameOf(value))) continue
      } catch {
        // ignore
      }
      if (!path) path = normalizePath(value)
      continue
    }

    const slug = toSlug(value)
    if (slug.length >= 4 && !projectSlugs.has(slug)) slugs.push(slug)
  }

  return { path, slugs }
}

async function fetchLandingLeadRows(
  sources: LandingPageSource[],
  startDate: string,
  endDate: string
): Promise<ParsedLead[]> {
  const supabase = getSupabaseAdmin()
  const rows: ParsedLead[] = []

  await Promise.all(
    sources.map(async (source) => {
      let data: Record<string, unknown>[] | null = null
      for (const columns of LEAD_SELECTS) {
        const result = await supabase
          .from(source.table_name)
          .select(columns)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`)
        if (!result.error) {
          data = (result.data || []) as Record<string, unknown>[]
          break
        }
      }
      for (const lead of data || []) {
        const hints = parseLeadHints(lead, source)
        rows.push({ table: source.table_name, ...hints })
      }
    })
  )

  return rows
}

function leadMatchesPage(lead: ParsedLead, pageUrl: string) {
  const pagePath = pathOfPage(pageUrl)
  if (lead.path) return lead.path === pagePath
  if (lead.slugs.length === 0) return false
  const lastSegment = pagePath.split('/').filter(Boolean).pop() || ''
  if (!lastSegment) return false
  return lead.slugs.some(
    (slug) => lastSegment === slug || lastSegment.includes(slug) || (lastSegment.length >= 4 && slug.includes(lastSegment))
  )
}

function attributeLeadsToPages(
  pageRows: Array<{ page: string }>,
  sources: LandingPageSource[],
  leads: ParsedLead[]
) {
  const pageLeadCounts = new Map<string, number>()
  const unmatchedByTable = new Map<string, number>()

  for (const source of sources) {
    const sourceLeads = leads.filter((lead) => lead.table === source.table_name)
    const sourcePages = pageRows.filter((row) => matchLandingSource(row.page, sources)?.table_name === source.table_name)
    const assigned = new Set<number>()

    for (const page of sourcePages) {
      let count = 0
      sourceLeads.forEach((lead, index) => {
        if (assigned.has(index)) return
        if (leadMatchesPage(lead, page.page)) {
          assigned.add(index)
          count += 1
        }
      })
      pageLeadCounts.set(page.page, count)
    }

    const leftover = sourceLeads.length - assigned.size
    if (leftover <= 0) continue
    if (sourcePages.length === 1) {
      const onlyPage = sourcePages[0].page
      pageLeadCounts.set(onlyPage, (pageLeadCounts.get(onlyPage) || 0) + leftover)
    } else {
      unmatchedByTable.set(source.table_name, leftover)
    }
  }

  return { pageLeadCounts, unmatchedByTable }
}

async function inspectProblemPages(
  searchconsole: Awaited<ReturnType<typeof getSearchConsoleClient>>,
  siteUrl: string,
  pages: Array<{ page: string; clicks: number; impressions: number; ctr: number }>
) {
  const issues = new Map<string, string>()
  const suspects = [...pages]
    .filter((page) => page.impressions >= 20 && (page.clicks === 0 || page.ctr < 0.01))
    .slice(0, 5)

  const results = await Promise.allSettled(
    suspects.map((page) =>
      searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: page.page,
          siteUrl,
        },
      })
    )
  )

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return
    const coverage = result.value.data.inspectionResult?.indexStatusResult?.coverageState || ''
    if (coverage && !/indexed/i.test(coverage)) {
      issues.set(suspects[index].page, coverage)
    }
  })

  return issues
}

function pageTitle(pageUrl: string, landingName: string | null) {
  try {
    const url = new URL(pageUrl)
    const path = url.pathname.replace(/\/$/, '')
    const host = url.hostname.replace(/^www\./, '')
    const pathLabel = path && path !== '/' ? path : ''
    if (landingName) return pathLabel ? `${landingName} (${pathLabel})` : landingName
    return pathLabel ? `${host}${pathLabel}` : host
  } catch {
    return landingName || pageUrl.replace(/^https?:\/\//, '')
  }
}

function landingStatus(
  clicks: number,
  impressions: number,
  leads: number,
  googlePages: number,
  hasIndexIssue: boolean
): Pick<SearchConsoleLandingComparison, 'status' | 'statusLabel' | 'why'> {
  if (hasIndexIssue) {
    return {
      status: 'hidden',
      statusLabel: 'Indexing issue',
      why: 'Google is not indexing this page properly.',
    }
  }
  if (googlePages === 0 && leads > 0) {
    return {
      status: 'improve',
      statusLabel: 'Leads, but not in Google',
      why: `${leads} landing-page leads, but this site did not show up in Search Console for this range.`,
    }
  }
  if (googlePages === 0) {
    return {
      status: 'hidden',
      statusLabel: 'Not showing in Google',
      why: 'No Search Console traffic. The site may not be added, or Google is not showing it.',
    }
  }
  if (clicks >= 3 && leads === 0) {
    return {
      status: 'not_converting',
      statusLabel: 'Clicks, no leads',
      why: `${formatPlainNumber(clicks)} Google clicks, but 0 landing-page leads.`,
    }
  }
  if (impressions >= 20 && clicks === 0) {
    return {
      status: 'improve',
      statusLabel: 'Shown, no clicks',
      why: `Google showed this ${formatPlainNumber(impressions)} times, and nobody clicked.`,
    }
  }
  if (impressions >= 30 && impressions > 0 && clicks / impressions < 0.02) {
    return {
      status: 'improve',
      statusLabel: 'Could get more clicks',
      why: `Shown ${formatPlainNumber(impressions)} times, but only ${((clicks / impressions) * 100).toFixed(1)}% clicked.`,
    }
  }
  if (leads > 0) {
    return {
      status: 'working',
      statusLabel: 'Working',
      why: `${formatPlainNumber(clicks)} Google clicks turned into ${leads} leads.`,
    }
  }
  return {
    status: 'working',
    statusLabel: 'Working',
    why: `${formatPlainNumber(clicks)} Google clicks, ${leads} leads.`,
  }
}

function comparisonRow(
  source: LandingPageSource,
  page: SearchConsolePageInsight | null,
  leads: number,
  clicks: number,
  impressions: number,
  googlePages: number,
  hasIndexIssue: boolean
): SearchConsoleLandingComparison {
  const pathLabel = page ? pathLabelOf(page.page) : 'other pages'
  const name =
    page && googlePages > 0
      ? sourcePagesLabel(source.display_name, pathLabel, true)
      : source.display_name
  const verdict = landingStatus(clicks, impressions, leads, googlePages, hasIndexIssue)
  return {
    name,
    projectName: source.display_name,
    table: source.table_name,
    siteUrl: page?.page || source.site_url,
    page: page?.page || null,
    pathLabel,
    leads,
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    googlePages,
    ...verdict,
  }
}

function sourcePagesLabel(projectName: string, pathLabel: string, splitByPage: boolean) {
  if (!splitByPage) return projectName
  return pathLabel === 'home' ? `${projectName} · home` : `${projectName} · ${pathLabel}`
}

function buildLandingComparison(
  sources: LandingPageSource[],
  pages: SearchConsolePageInsight[],
  unmatchedByTable: Map<string, number>
): SearchConsoleLandingComparison[] {
  const rows: SearchConsoleLandingComparison[] = []

  for (const source of sources) {
    const matched = pages
      .filter((page) => page.landingPageTable === source.table_name)
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    const leftover = unmatchedByTable.get(source.table_name) || 0

    if (matched.length === 0) {
      rows.push(comparisonRow(source, null, leftover, 0, 0, 0, false))
      continue
    }

    const splitByPage = matched.length > 1
    for (const page of matched) {
      const row = comparisonRow(
        source,
        page,
        page.leads,
        page.clicks,
        page.impressions,
        1,
        page.status === 'hidden'
      )
      row.name = sourcePagesLabel(source.display_name, row.pathLabel, splitByPage)
      rows.push(row)
    }

    if (leftover > 0 && splitByPage) {
      const extra = comparisonRow(source, null, leftover, 0, 0, 0, false)
      extra.name = `${source.display_name} · other pages`
      extra.why = `${leftover} leads in the last 7 days that could not be tied to a specific Google page.`
      extra.status = 'improve'
      extra.statusLabel = 'Leads not tied to a page'
      rows.push(extra)
    }
  }

  return rows.sort((a, b) => b.leads - a.leads || b.clicks - a.clicks || b.impressions - a.impressions)
}

function buildPageInsight(
  row: { page: string; clicks: number; impressions: number; ctr: number; position: number },
  sources: LandingPageSource[],
  leads: number,
  unmatchedByTable: Map<string, number>,
  indexIssue: string | null
): SearchConsolePageInsight {
  const source = matchLandingSource(row.page, sources)
  const title = pageTitle(row.page, source?.display_name || null)
  const unmatched = source ? unmatchedByTable.get(source.table_name) || 0 : 0

  let status: SearchConsolePageInsight['status'] = 'working'
  let statusLabel = 'Working'
  let why = source
    ? `${formatPlainNumber(row.clicks)} Google clicks. This page had ${leads} leads in the last 7 days.`
    : `${formatPlainNumber(row.clicks)} Google clicks.`

  if (indexIssue) {
    status = 'hidden'
    statusLabel = 'Indexing issue'
    why = `Google says: ${indexIssue}.`
  } else if (row.clicks >= 3 && source && leads === 0 && unmatched === 0) {
    status = 'not_converting'
    statusLabel = 'Clicks, no leads'
    why = `${formatPlainNumber(row.clicks)} Google clicks, but 0 leads from this page.`
  } else if (row.impressions >= 20 && row.clicks === 0) {
    status = 'improve'
    statusLabel = 'Shown, no clicks'
    why = `Shown ${formatPlainNumber(row.impressions)} times, nobody clicked.`
  } else if (row.impressions >= 30 && row.ctr < 0.02) {
    status = 'improve'
    statusLabel = 'Could rank/click better'
    why = `Shown a lot (${formatPlainNumber(row.impressions)}) but only ${(row.ctr * 100).toFixed(1)}% click through.`
  } else if (row.position >= 15 && row.impressions >= 10) {
    status = 'improve'
    statusLabel = 'Buried in Google'
    why = `Average Google rank is ${row.position.toFixed(1)} — usually below the first page.`
  } else if (row.clicks >= 2 && leads > 0) {
    why = `${formatPlainNumber(row.clicks)} clicks turned into ${leads} leads.`
  }

  return {
    page: row.page,
    title,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
    leads,
    landingPageName: source?.display_name || null,
    landingPageTable: source?.table_name || null,
    status,
    statusLabel,
    why,
    indexIssue,
  }
}
