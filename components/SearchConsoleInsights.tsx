'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Unplug,
} from 'lucide-react'
import Link from 'next/link'

type PageInsight = {
  page: string
  title: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  leads: number
  landingPageName: string | null
  status: 'working' | 'improve' | 'not_converting' | 'hidden'
  statusLabel: string
  why: string
}

type LandingRow = {
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
  status: PageInsight['status']
  statusLabel: string
  why: string
}

type Stats = {
  connected: boolean
  error?: string
  sites?: Array<{ siteUrl: string; permissionLevel: string }>
  selectedSite?: string | null
  range?: { startDate: string; endDate: string }
  totals?: { clicks: number; impressions: number; ctr: number; position: number }
  queries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  topWorking?: PageInsight[]
  topViews?: PageInsight[]
  needsWork?: PageInsight[]
  landingComparison?: LandingRow[]
  summary?: string
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function formatRange(range?: { startDate: string; endDate: string }) {
  if (!range) return ''
  const start = new Date(`${range.startDate}T12:00:00`)
  const end = new Date(`${range.endDate}T12:00:00`)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-CA', opts)} – ${end.toLocaleDateString('en-CA', {
    ...opts,
    year: 'numeric',
  })}`
}

function groupLandingRows(rows: LandingRow[]) {
  const groups: Array<{ project: string; rows: LandingRow[] }> = []
  const indexByProject = new Map<string, number>()
  for (const row of rows) {
    const project = row.projectName || row.name
    const existing = indexByProject.get(project)
    if (existing === undefined) {
      indexByProject.set(project, groups.length)
      groups.push({ project, rows: [row] })
    } else {
      groups[existing].rows.push(row)
    }
  }
  return groups
}

function statusClass(status: PageInsight['status']) {
  if (status === 'working') return 'bg-emerald-50 text-emerald-800'
  if (status === 'hidden') return 'bg-red-50 text-red-800'
  if (status === 'not_converting') return 'bg-orange-50 text-orange-800'
  return 'bg-amber-50 text-amber-900'
}

export default function SearchConsoleInsights() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [siteUrl, setSiteUrl] = useState('all')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (nextSite = 'all') => {
    setLoading(true)
    try {
      const query = nextSite && nextSite !== 'all' ? `?siteUrl=${encodeURIComponent(nextSite)}` : '?siteUrl=all'
      const res = await fetch(`/api/search-console/stats${query}`)
      const data = (await res.json()) as Stats
      setStats(data)
      if (data.selectedSite) setSiteUrl(data.selectedSite)
    } catch {
      setStats({ connected: false, error: 'Could not load Search Console.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('gsc') === 'connected') {
      setNotice('Search Console connected. Use the Google account that owns your sites.')
    } else if (params.get('gsc') === 'error') {
      setNotice('Search Console login failed. Sign in with the other Google account and try again.')
    }
    load('all')
  }, [load])

  async function disconnect() {
    await fetch('/api/search-console/disconnect', { method: 'POST' })
    setStats({ connected: false })
    setNotice('')
  }

  const landingRows = stats?.landingComparison || []
  const activeLandings = landingRows.filter(
    (row) => row.leads > 0 || row.clicks > 0 || row.impressions > 0
  )
  const quietLandings = landingRows.filter(
    (row) => row.leads === 0 && row.clicks === 0 && row.impressions === 0
  )

  return (
    <div id="search-console" className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Search Console</h2>
          <p className="text-sm text-gray-500 mt-1">
            Plain-language look at what Google is sending you, and how that compares to{' '}
            <Link href="/landing-pages-leads" className="text-gray-800 underline underline-offset-2">
              Landing Pages Leads
            </Link>
            .
          </p>
        </div>
        {stats?.connected ? (
          <button
            type="button"
            onClick={disconnect}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600"
          >
            <Unplug className="h-4 w-4" />
            Disconnect
          </button>
        ) : null}
      </div>

      {notice ? <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Search Console and landing-page leads…
        </div>
      ) : !stats?.connected ? (
        <div className="rounded-xl bg-gray-50 px-4 py-6 text-center">
          <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
            Google will ask which account to use. Pick the Search Console account, not Qikfill calendar.
          </p>
          <a
            href="/api/search-console/oauth"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            Connect Search Console
            <ExternalLink className="h-4 w-4" />
          </a>
          {stats?.error ? <p className="mt-3 text-xs text-red-600">{stats.error}</p> : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {(stats.sites?.length || 0) > 1 ? (
              <select
                value={siteUrl}
                onChange={(event) => {
                  setSiteUrl(event.target.value)
                  load(event.target.value)
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All landing sites</option>
                {stats.sites?.map((site) => (
                  <option key={site.siteUrl} value={site.siteUrl}>
                    {site.siteUrl.replace(/^sc-domain:/, '')}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-600">{stats.selectedSite === 'all' ? 'All sites' : stats.selectedSite}</p>
            )}
            {stats.range ? (
              <span className="text-xs text-gray-400">Last 7 days · {formatRange(stats.range)}</span>
            ) : null}
          </div>

          {stats.summary ? (
            <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-800 leading-relaxed">{stats.summary}</p>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Google clicks" hint="People who clicked through to the site" value={formatNumber(stats.totals?.clicks || 0)} />
            <StatCard label="Times shown" hint="How often the page appeared in Google" value={formatNumber(stats.totals?.impressions || 0)} />
            <StatCard label="Click rate" hint="Clicks ÷ times shown" value={formatPercent(stats.totals?.ctr || 0)} />
            <StatCard label="Average Google rank" hint="Lower is better. 1 is the top result." value={(stats.totals?.position || 0).toFixed(1)} />
          </div>

          <section>
            <div className="mb-3">
              <h3 className="text-base font-semibold text-gray-900">Landing pages vs Google</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Last 7 days. If a project has more than one page, each URL is listed on its own with that page’s Google clicks and leads.
              </p>
            </div>
            {activeLandings.length === 0 ? (
              <p className="text-sm text-gray-400">No matching landing-page traffic in this range yet.</p>
            ) : (
              <div className="space-y-4">
                {groupLandingRows(activeLandings).map((group) => (
                  <div key={group.project}>
                    {group.rows.length > 1 ? (
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">{group.project}</h4>
                    ) : null}
                    <div className="space-y-2">
                      {group.rows.map((row) => (
                        <ComparisonCard key={`${row.table}-${row.page || row.pathLabel}`} row={row} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {quietLandings.length > 0 ? (
              <p className="mt-3 text-xs text-gray-400">
                No Google traffic and no leads: {[...new Set(quietLandings.map((row) => row.projectName || row.name))].join(', ')}.
              </p>
            ) : null}
          </section>

          <section>
            <SectionTitle
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              title="Top 10 pages with Google traffic"
              subtitle="Most clicks in the last 7 days. This includes pages that still need work."
            />
            <PageList rows={stats.topWorking || []} empty="No Google traffic in this range yet." />
          </section>

          <section>
            <SectionTitle
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              title="Needs work"
              subtitle="Indexing problems, nobody clicking, or clicks that are not turning into leads."
            />
            <PageList rows={stats.needsWork || []} empty="Nothing looks broken right now." />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section>
              <SectionTitle
                icon={<BarChart3 className="h-4 w-4 text-gray-500" />}
                title="Most seen in Google"
                subtitle="Pages Google showed the most, even if people did not click."
              />
              <PageList rows={stats.topViews || []} empty="No impression data yet." compact />
            </section>
            <section>
              <SectionTitle
                icon={<Search className="h-4 w-4 text-gray-500" />}
                title="What people typed"
                subtitle="Top Google searches that brought people to the busiest site."
              />
              {(stats.queries || []).length === 0 ? (
                <p className="text-sm text-gray-400">No search queries in this range.</p>
              ) : (
                <ol className="space-y-2">
                  {(stats.queries || []).map((row, index) => (
                    <li key={row.query} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-gray-800">
                        <span className="text-gray-400 mr-2">{index + 1}.</span>
                        {row.query}
                      </span>
                      <span className="shrink-0 text-gray-500">
                        {formatNumber(row.clicks)} clicks · shown {formatNumber(row.impressions)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
      <div className="text-[11px] text-gray-400 mt-1 leading-snug">{hint}</div>
    </div>
  )
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-3">
      <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  )
}

function ComparisonCard({ row }: { row: LandingRow }) {
  return (
    <div className="rounded-xl border border-gray-100 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-gray-900">{row.name}</div>
          <p className="text-sm text-gray-600 mt-1">{row.why}</p>
          {row.page ? (
            <a
              href={row.page}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 truncate max-w-full"
            >
              {row.page.replace(/^https?:\/\//, '')}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : null}
        </div>
        <span className={`text-xs font-medium rounded-full px-2 py-1 ${statusClass(row.status)}`}>
          {row.statusLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Leads (7 days)" value={formatNumber(row.leads)} />
        <Metric label="Google clicks" value={formatNumber(row.clicks)} />
        <Metric label="Times shown" value={formatNumber(row.impressions)} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-2">
      <div className="text-sm font-semibold text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  )
}

function PageList({
  rows,
  empty,
  compact = false,
}: {
  rows: PageInsight[]
  empty: string
  compact?: boolean
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">{empty}</p>
  }

  return (
    <ol className="space-y-2">
      {rows.map((row, index) => (
        <li key={`${row.page}-${index}`} className="rounded-xl border border-gray-100 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                <span className="text-gray-400 mr-2">{index + 1}.</span>
                {row.title}
              </div>
              {!compact ? <p className="text-sm text-gray-600 mt-1">{row.why}</p> : null}
              <a
                href={row.page}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 truncate max-w-full"
              >
                {row.page.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
            <span className={`shrink-0 text-xs font-medium rounded-full px-2 py-1 ${statusClass(row.status)}`}>
              {row.statusLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>{formatNumber(row.clicks)} clicks</span>
            <span>shown {formatNumber(row.impressions)}</span>
            {row.landingPageName ? <span>{formatNumber(row.leads)} leads (7 days)</span> : null}
            <span>rank {row.position.toFixed(1)}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}
