'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, ExternalLink, Loader2, Unplug } from 'lucide-react'

type Stats = {
  connected: boolean
  error?: string
  sites?: Array<{ siteUrl: string; permissionLevel: string }>
  selectedSite?: string | null
  range?: { startDate: string; endDate: string }
  totals?: { clicks: number; impressions: number; ctr: number; position: number }
  queries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
  pages?: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function formatPosition(value: number) {
  return value.toFixed(1)
}

export default function SearchConsoleInsights() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [siteUrl, setSiteUrl] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async (nextSite?: string) => {
    setLoading(true)
    try {
      const query = nextSite ? `?siteUrl=${encodeURIComponent(nextSite)}` : ''
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
    load()
  }, [load])

  async function disconnect() {
    await fetch('/api/search-console/disconnect', { method: 'POST' })
    setStats({ connected: false })
    setNotice('')
  }

  return (
    <div id="search-console" className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Search Console</h2>
          <p className="text-sm text-gray-500 mt-1">
            Connect the Google account that owns Search Console — not the calendar account.
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
          Loading Search Console…
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
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {(stats.sites?.length || 0) > 1 ? (
              <select
                value={siteUrl}
                onChange={(event) => {
                  setSiteUrl(event.target.value)
                  load(event.target.value)
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {stats.sites?.map((site) => (
                  <option key={site.siteUrl} value={site.siteUrl}>
                    {site.siteUrl}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-600">{stats.selectedSite || 'No verified sites'}</p>
            )}
            {stats.range ? (
              <span className="text-xs text-gray-400">
                {stats.range.startDate} to {stats.range.endDate}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard label="Clicks" value={formatNumber(stats.totals?.clicks || 0)} />
            <StatCard label="Impressions" value={formatNumber(stats.totals?.impressions || 0)} />
            <StatCard label="CTR" value={formatPercent(stats.totals?.ctr || 0)} />
            <StatCard label="Avg position" value={formatPosition(stats.totals?.position || 0)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DataList
              title="Top queries"
              rows={(stats.queries || []).map((row) => ({
                label: row.query,
                clicks: row.clicks,
                impressions: row.impressions,
              }))}
            />
            <DataList
              title="Top pages"
              rows={(stats.pages || []).map((row) => ({
                label: row.page.replace(/^https?:\/\//, ''),
                clicks: row.clicks,
                impressions: row.impressions,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  )
}

function DataList({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; clicks: number; impressions: number }>
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No data for this range.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-gray-700 truncate" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 text-gray-500">
                {formatNumber(row.clicks)} / {formatNumber(row.impressions)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
