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
  table: string
  siteUrl: string
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
  start.setUTCDate(start.getUTCDate() - 27)
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
            requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 50, dataState: 'all' },
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

  const [queriesRes, leadCounts] = await Promise.all([
    searchconsole.searchanalytics
      .query({
        siteUrl: querySite,
        requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 10, dataState: 'all' },
      })
      .catch(() => ({ data: { rows: [] as Array<{ keys?: string[]; clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }> } })),
    countLandingPageLeads(landingSources, startDate, endDate).catch(() => new Map<string, number>()),
  ])

  const indexIssues = viewingAll
    ? new Map<string, string>()
    : await inspectProblemPages(searchconsole, selectedSite, pageRows).catch(() => new Map<string, string>())

  const pages = pageRows.map((row) =>
    buildPageInsight(row, landingSources, leadCounts, indexIssues.get(row.page) || null)
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
  const landingComparison = buildLandingComparison(landingSources, pages, leadCounts)

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

function gscSiteMatchesLanding(gscSiteUrl: string, source: LandingPageSource) {
  const site = source.site_url || ''
  if (!site) return false
  const gscHost = hostnameOf(gscSiteUrl)
  const sourceHost = hostnameOf(site)
  if (!gscHost || !sourceHost) return false
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

async function countLandingPageLeads(
  sources: LandingPageSource[],
  startDate: string,
  endDate: string
) {
  const supabase = getSupabaseAdmin()
  const counts = new Map<string, number>()
  await Promise.all(
    sources.map(async (source) => {
      try {
        const { count, error } = await supabase
          .from(source.table_name)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`)
        counts.set(source.table_name, error ? 0 : count || 0)
      } catch {
        counts.set(source.table_name, 0)
      }
    })
  )
  return counts
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
  if (clicks >= 5 && leads === 0) {
    return {
      status: 'not_converting',
      statusLabel: 'Clicks, no leads',
      why: `${formatPlainNumber(clicks)} Google clicks, but 0 landing-page leads.`,
    }
  }
  if (impressions >= 50 && clicks === 0) {
    return {
      status: 'improve',
      statusLabel: 'Shown, no clicks',
      why: `Google showed this ${formatPlainNumber(impressions)} times, and nobody clicked.`,
    }
  }
  if (impressions >= 80 && impressions > 0 && clicks / impressions < 0.02) {
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

function buildLandingComparison(
  sources: LandingPageSource[],
  pages: SearchConsolePageInsight[],
  leadCounts: Map<string, number>
): SearchConsoleLandingComparison[] {
  return sources
    .map((source) => {
      const matched = pages.filter((page) => page.landingPageTable === source.table_name)
      const clicks = matched.reduce((sum, page) => sum + page.clicks, 0)
      const impressions = matched.reduce((sum, page) => sum + page.impressions, 0)
      const leads = leadCounts.get(source.table_name) || 0
      const hasIndexIssue = matched.some((page) => page.status === 'hidden')
      const verdict = landingStatus(clicks, impressions, leads, matched.length, hasIndexIssue)
      return {
        name: source.display_name,
        table: source.table_name,
        siteUrl: source.site_url,
        leads,
        clicks,
        impressions,
        ctr: impressions ? clicks / impressions : 0,
        googlePages: matched.length,
        ...verdict,
      }
    })
    .sort((a, b) => b.leads - a.leads || b.clicks - a.clicks || b.impressions - a.impressions)
}

function buildPageInsight(
  row: { page: string; clicks: number; impressions: number; ctr: number; position: number },
  sources: LandingPageSource[],
  leadCounts: Map<string, number>,
  indexIssue: string | null
): SearchConsolePageInsight {
  const source = matchLandingSource(row.page, sources)
  const leads = source ? leadCounts.get(source.table_name) || 0 : 0
  const title = pageTitle(row.page, source?.display_name || null)

  let status: SearchConsolePageInsight['status'] = 'working'
  let statusLabel = 'Working'
  let why = source
    ? `${formatPlainNumber(row.clicks)} Google clicks. This landing page had ${leads} leads.`
    : `${formatPlainNumber(row.clicks)} Google clicks.`

  if (indexIssue) {
    status = 'hidden'
    statusLabel = 'Indexing issue'
    why = `Google says: ${indexIssue}.`
  } else if (row.clicks >= 5 && source && leads === 0) {
    status = 'not_converting'
    statusLabel = 'Clicks, no leads'
    why = `${formatPlainNumber(row.clicks)} Google clicks, but 0 landing-page leads.`
  } else if (row.impressions >= 50 && row.clicks === 0) {
    status = 'improve'
    statusLabel = 'Shown, no clicks'
    why = `Shown ${formatPlainNumber(row.impressions)} times, nobody clicked.`
  } else if (row.impressions >= 80 && row.ctr < 0.02) {
    status = 'improve'
    statusLabel = 'Could rank/click better'
    why = `Shown a lot (${formatPlainNumber(row.impressions)}) but only ${(row.ctr * 100).toFixed(1)}% click through.`
  } else if (row.position >= 15 && row.impressions >= 20) {
    status = 'improve'
    statusLabel = 'Buried in Google'
    why = `Average Google rank is ${row.position.toFixed(1)} — usually below the first page.`
  } else if (row.clicks >= 3 && leads > 0) {
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
