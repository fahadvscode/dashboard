import { createClient } from '@supabase/supabase-js'

export const SEARCH_CONSOLE_TOKEN_TYPE = 'search_console'
export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export const DEFAULT_SEARCH_CONSOLE_REDIRECT_URI =
  'https://property-dashboard-three.vercel.app/api/search-console/oauth-callback'

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

export function getSearchConsoleOAuthClient() {
  const { google } = require('googleapis') as typeof import('googleapis')
  const clientId =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || process.env.QIKFILL_GOOGLE_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || process.env.QIKFILL_GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Search Console Google OAuth client is not configured.')
  }
  return new google.auth.OAuth2(clientId, clientSecret, getSearchConsoleRedirectUri())
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
    return {
      connected: true as const,
      sites,
      selectedSite: null as string | null,
      range: getSearchConsoleDateRange(),
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      queries: [] as Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>,
      pages: [] as Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>,
    }
  }

  const preferred = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || requestedSiteUrl
  const selectedSite =
    sites.find((site) => site.siteUrl === preferred)?.siteUrl || sites[0].siteUrl
  const { startDate, endDate } = getSearchConsoleDateRange()

  const [totalsRes, queriesRes, pagesRes] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl: selectedSite,
      requestBody: { startDate, endDate, dataState: 'all' },
    }),
    searchconsole.searchanalytics.query({
      siteUrl: selectedSite,
      requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 10, dataState: 'all' },
    }),
    searchconsole.searchanalytics.query({
      siteUrl: selectedSite,
      requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 10, dataState: 'all' },
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
    pages: (pagesRes.data.rows || []).map((row) => ({
      page: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    })),
  }
}
