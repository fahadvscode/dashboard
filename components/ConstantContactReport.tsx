'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from '@/lib/shareLinks'
import type { AccountReport, ReportAccountId, ReportCampaign } from '@/lib/constantContactReportTypes'

type EmailDesign = {
  name: string
  subject: string
  permalinkUrl: string
  previewHtml: string
}

const ACCOUNTS: { id: ReportAccountId; name: string }[] = [
  { id: 'primary', name: 'Fahad Javed Real Estate' },
  { id: 'second', name: 'Precon Factory' },
  { id: 'third', name: 'GTA Lowrise' },
]

function torontoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function percent(value: number | null) {
  if (value == null) return '—'
  return `${value.toFixed(1)}%`
}

function count(value: number | null) {
  if (value == null) return '—'
  return value.toLocaleString('en-CA')
}

function statusLabel(campaign: ReportCampaign) {
  if (campaign.status === 'scheduled') return campaign.when ? `Scheduled ${campaign.when}` : 'Scheduled'
  if (campaign.status === 'sending') return 'Sending now'
  return campaign.when ? `Sent ${campaign.when}` : 'Sent'
}

export default function ConstantContactReport() {
  const [day, setDay] = useState(torontoToday)
  const [reports, setReports] = useState<Record<string, AccountReport | null>>({})
  const [active, setActive] = useState<ReportAccountId | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [design, setDesign] = useState<EmailDesign | null>(null)
  const [designError, setDesignError] = useState('')
  const [designLoading, setDesignLoading] = useState(false)
  const [copiedId, setCopiedId] = useState('')
  const requestRef = useRef<AbortController | null>(null)
  const designCache = useRef<Record<string, EmailDesign>>({})

  const loadDesign = useCallback(async (accountId: ReportAccountId, campaignId: string) => {
    const key = `${accountId}:${campaignId}`
    const cached = designCache.current[key]
    if (cached) return cached
    const response = await fetch(`/api/constant-contact/email?account=${accountId}&campaign=${campaignId}`, { cache: 'no-store' })
    const body = (await response.json()) as EmailDesign & { error?: string }
    if (!response.ok || body.error) throw new Error(body.error || 'Could not open this email.')
    designCache.current[key] = body
    return body
  }, [])

  async function viewDesign(accountId: ReportAccountId, campaign: ReportCampaign) {
    setDesign({ name: campaign.name, subject: '', permalinkUrl: '', previewHtml: '' })
    setDesignError('')
    setDesignLoading(true)
    try {
      const body = await loadDesign(accountId, campaign.id)
      setDesign(body)
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : 'Could not open this email.')
    } finally {
      setDesignLoading(false)
    }
  }

  async function copyLink(accountId: ReportAccountId, campaign: ReportCampaign) {
    setCopiedId('')
    try {
      const body = await loadDesign(accountId, campaign.id)
      if (!body.permalinkUrl) {
        setDesign(body)
        setDesignError('This email does not have a public link yet.')
        return
      }
      const copied = await copyText(body.permalinkUrl)
      if (!copied) {
        setDesign(body)
        setDesignError('The link is ready, but it could not be copied. Select it below.')
        return
      }
      setCopiedId(campaign.id)
      window.setTimeout(() => setCopiedId((current) => (current === campaign.id ? '' : current)), 2000)
    } catch (error) {
      setDesignError(error instanceof Error ? error.message : 'Could not get the link.')
      setDesign({ name: campaign.name, subject: '', permalinkUrl: '', previewHtml: '' })
    }
  }

  const load = useCallback(async (selectedDay: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const signal = controller.signal
    setReports({})
    setUpdatedAt(null)
    const next: Record<string, AccountReport | null> = {}
    for (const account of ACCOUNTS) {
      if (signal.aborted) return
      setActive(account.id)
      try {
        const response = await fetch(`/api/constant-contact/report?account=${account.id}&date=${selectedDay}`, {
          cache: 'no-store',
          signal,
        })
        const body = (await response.json()) as AccountReport
        next[account.id] = body.error && !body.name
          ? { id: account.id, name: account.name, campaigns: [], error: body.error }
          : body
      } catch (error) {
        if (signal.aborted) return
        next[account.id] = {
          id: account.id,
          name: account.name,
          campaigns: [],
          error: error instanceof Error ? error.message : 'Could not refresh this account.',
        }
      }
      if (signal.aborted) return
      setReports({ ...next })
    }
    if (signal.aborted) return
    setActive(null)
    setUpdatedAt(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Toronto',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date()))
  }, [])

  useEffect(() => {
    void load(day)
    return () => requestRef.current?.abort()
  }, [day, load])

  const step = active ? ACCOUNTS.findIndex((account) => account.id === active) + 1 : updatedAt ? ACCOUNTS.length : 0
  const activeName = ACCOUNTS.find((account) => account.id === active)?.name

  return (
    <section className="text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Constant Contact</h1>
          <p className="mt-1 text-sm text-slate-500">Sent emails and emails scheduled for the day you pick. Today is the usual view.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="report-day">Day</label>
          <input
            id="report-day"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void load(day)}
            disabled={active != null}
            className="rounded-full bg-[#0C5C35] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#0C5C35] transition-all"
            style={{ width: `${(step / ACCOUNTS.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {activeName
            ? `Reading ${activeName} · ${step} of ${ACCOUNTS.length}`
            : updatedAt
              ? `Updated ${updatedAt}`
              : 'Starting'}
        </p>
      </div>

      <div className="mt-6 space-y-5">
        {ACCOUNTS.map((account) => {
          const report = reports[account.id]
          const reading = active === account.id && !report
          return (
            <article key={account.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-semibold">{account.name}</h2>
              {reading && <p className="mt-3 text-sm text-slate-500">Reading campaigns and matching signups…</p>}
              {!reading && !report && <p className="mt-3 text-sm text-slate-400">Waiting</p>}
              {report?.error && <p className="mt-3 text-sm text-red-700">{report.error}</p>}
              {report && !report.error && report.campaigns.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">Nothing sent or scheduled on this day.</p>
              )}
              {report && report.campaigns.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="pb-2 pr-3 font-medium">Campaign</th>
                        <th className="pb-2 pr-3 font-medium">Open rate</th>
                        <th className="pb-2 pr-3 font-medium">Click rate</th>
                        <th className="pb-2 pr-3 font-medium">Unsubscribed</th>
                        <th className="pb-2 pr-3 font-medium">Bounced</th>
                        <th className="pb-2 font-medium">Signups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-t border-slate-100 align-top">
                          <td className="py-3 pr-3">
                            <div className="font-medium">{campaign.name}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{statusLabel(campaign)}</div>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => void viewDesign(account.id, campaign)}
                                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-[#0C5C35]"
                              >
                                View design
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyLink(account.id, campaign)}
                                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-[#0C5C35]"
                              >
                                {copiedId === campaign.id ? 'Copied' : 'Copy link'}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 pr-3">{percent(campaign.openRate)}</td>
                          <td className="py-3 pr-3">{percent(campaign.clickRate)}</td>
                          <td className="py-3 pr-3">{count(campaign.unsubscribed)}</td>
                          <td className="py-3 pr-3">{count(campaign.bounced)}</td>
                          <td className="py-3">
                            {campaign.signups == null ? '—' : (
                              <div>
                                <div className="font-medium">{campaign.signups.total.toLocaleString('en-CA')}</div>
                                {campaign.signups.pages.map((page) => (
                                  <div key={page.name} className="text-xs text-slate-500">{page.name} {page.count}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {design && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setDesign(null)}>
          <div
            className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">{design.name}</h3>
                {design.subject && <p className="mt-1 text-sm text-slate-500">{design.subject}</p>}
              </div>
              <button type="button" onClick={() => setDesign(null)} className="text-sm font-semibold text-slate-500">Close</button>
            </div>
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              {designLoading && <p className="text-sm text-slate-500">Opening the email…</p>}
              {designError && <p className="text-sm text-red-700">{designError}</p>}
              {design.permalinkUrl && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email link</p>
                  <div className="mt-1 flex gap-2">
                    <input readOnly value={design.permalinkUrl} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <button
                      type="button"
                      onClick={() => void copyText(design.permalinkUrl)}
                      className="rounded-full bg-[#0C5C35] px-3 py-2 text-sm font-semibold text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              {design.previewHtml && (
                <iframe
                  title={design.name}
                  sandbox=""
                  srcDoc={design.previewHtml}
                  className="h-[65dvh] w-full rounded-2xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
