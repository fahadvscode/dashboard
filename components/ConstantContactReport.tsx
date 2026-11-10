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

type StreamEvent =
  | { type: 'progress'; step: number; message: string }
  | { type: 'report'; report: AccountReport }

const ACCOUNTS: { id: ReportAccountId; name: string }[] = [
  { id: 'primary', name: 'Fahad Javed Real Estate' },
  { id: 'second', name: 'Precon Factory' },
  { id: 'third', name: 'GTA Lowrise' },
]

const STEPS = [
  'Pick the day',
  'Read the accounts',
  'Fill the sent emails',
  'Count signups from leads',
  'Show what is still scheduled',
  'Show the result',
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

function countLabel(value: number | null) {
  if (value == null) return '—'
  return value.toLocaleString('en-CA')
}

function statusLabel(campaign: ReportCampaign) {
  if (campaign.status === 'scheduled') return campaign.when ? `Scheduled ${campaign.when}` : 'Scheduled'
  if (campaign.status === 'sending') return 'Sending now'
  return campaign.when ? `Sent ${campaign.when}` : 'Sent'
}

async function readEvents(response: Response, onEvent: (event: StreamEvent) => void) {
  if (!response.body) throw new Error('Could not read this account.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as StreamEvent)
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent)
}

export default function ConstantContactReport({
  accessCode,
  onUnauthorized,
}: {
  accessCode: string
  onUnauthorized: () => void
}) {
  const [day, setDay] = useState(torontoToday)
  const [reports, setReports] = useState<Record<string, AccountReport | null>>({})
  const [active, setActive] = useState<ReportAccountId | null>(null)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState({ step: 1, message: 'Picking the day. Today is selected, Toronto time.' })
  const [design, setDesign] = useState<EmailDesign | null>(null)
  const [designError, setDesignError] = useState('')
  const [designLoading, setDesignLoading] = useState(false)
  const [copiedId, setCopiedId] = useState('')
  const [openBrand, setOpenBrand] = useState<ReportAccountId | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const designCache = useRef<Record<string, EmailDesign>>({})
  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized

  const loadDesign = useCallback(async (accountId: ReportAccountId, campaignId: string) => {
    const key = `${accountId}:${campaignId}`
    const cached = designCache.current[key]
    if (cached) return cached
    const response = await fetch(`/api/constant-contact/email?account=${accountId}&campaign=${campaignId}`, {
      cache: 'no-store',
      headers: { 'x-broker-code': accessCode },
    })
    if (response.status === 401) {
      unauthorizedRef.current()
      throw new Error('UNAUTHORIZED')
    }
    const body = (await response.json()) as EmailDesign & { error?: string }
    if (!response.ok || body.error) throw new Error(body.error || 'Could not open this email.')
    designCache.current[key] = body
    return body
  }, [accessCode])

  async function viewDesign(accountId: ReportAccountId, campaign: ReportCampaign) {
    setDesign({ name: campaign.name, subject: '', permalinkUrl: '', previewHtml: '' })
    setDesignError('')
    setDesignLoading(true)
    try {
      const body = await loadDesign(accountId, campaign.id)
      setDesign(body)
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') return
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
      if (error instanceof Error && error.message === 'UNAUTHORIZED') return
      setDesignError(error instanceof Error ? error.message : 'Could not get the link.')
      setDesign({ name: campaign.name, subject: '', permalinkUrl: '', previewHtml: '' })
    }
  }

  const load = useCallback(async (selectedDay: string) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const signal = controller.signal
    designCache.current = {}
    setOpenBrand(null)
    setReports({})
    setDone(false)
    setActive(null)
    setProgress({
      step: 1,
      message: selectedDay === torontoToday()
        ? 'Picking the day. Today is selected, Toronto time.'
        : `Picking the day. ${selectedDay} is selected, Toronto time.`,
    })

    const next: Record<string, AccountReport | null> = {}
    for (const account of ACCOUNTS) {
      if (signal.aborted) return
      setActive(account.id)
      try {
        const response = await fetch(`/api/constant-contact/report?account=${account.id}&date=${selectedDay}`, {
          cache: 'no-store',
          signal,
          headers: { 'x-broker-code': accessCode },
        })
        if (response.status === 401) {
          unauthorizedRef.current()
          return
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error || 'Could not refresh this account.')
        }
        let report: AccountReport | null = null
        await readEvents(response, (event) => {
          if (signal.aborted) return
          if (event.type === 'progress') setProgress({ step: event.step, message: event.message })
          if (event.type === 'report') report = event.report
        })
        next[account.id] = report || {
          id: account.id,
          name: account.name,
          campaigns: [],
          error: 'Could not refresh this account.',
        }
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
    setDone(true)
    setProgress({ step: 6, message: 'Showing the result.' })
  }, [accessCode])

  useEffect(() => {
    void load(day)
    return () => requestRef.current?.abort()
  }, [day, load])

  const accountIndex = Math.max(0, ACCOUNTS.findIndex((account) => account.id === active))
  const bar = done ? 1 : active ? (accountIndex + progress.step / 5) / ACCOUNTS.length : 1 / 6

  return (
    <section className="text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Constant Contact</h2>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Sent emails and emails scheduled for the day you pick. Today is the usual view.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="report-day">Day</label>
          <input
            id="report-day"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-base sm:flex-none sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void load(day)}
            disabled={active != null}
            className="min-h-11 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${bar * 100}%` }} />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-800">{progress.step}. {progress.message}</p>
        <ol className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 sm:flex">
          {STEPS.map((label, index) => (
            <li key={label} className={index + 1 === progress.step ? 'font-semibold text-emerald-800' : undefined}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 space-y-3 md:space-y-5">
        {ACCOUNTS.map((account) => {
          const report = reports[account.id]
          const reading = active === account.id && !report
          const open = openBrand === account.id
          const summary = reading
            ? 'Working'
            : !report
              ? 'Waiting'
              : report.error
                ? 'Could not read'
                : report.campaigns.length === 0
                  ? 'Nothing today'
                  : `${report.campaigns.length} email${report.campaigns.length === 1 ? '' : 's'}`
          return (
            <article key={account.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenBrand(open ? null : account.id)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left md:hidden"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{account.name}</span>
                  <span className="block text-sm text-slate-500">{summary}</span>
                </span>
                <span className="text-slate-400">{open ? '▴' : '▾'}</span>
              </button>
              <div className={`${open ? 'block' : 'hidden'} px-4 pb-4 md:block md:p-5`}>
              <h3 className="hidden text-lg font-semibold md:block">{account.name}</h3>
              {reading && <p className="mt-3 text-sm text-slate-500">Working through this account…</p>}
              {!reading && !report && <p className="mt-3 text-sm text-slate-400">Waiting</p>}
              {report?.error && <p className="mt-3 text-sm text-red-700">{report.error}</p>}
              {report && !report.error && report.campaigns.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">Nothing sent or scheduled on this day.</p>
              )}
              {report && report.campaigns.length > 0 && (
                <div className="mt-4 space-y-3 md:hidden">
                  {report.campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="font-semibold leading-snug">{campaign.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{statusLabel(campaign)}</div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-white px-3 py-2">
                          <dt className="text-xs text-slate-500">Open rate</dt>
                          <dd className="font-semibold">{percent(campaign.openRate)}</dd>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <dt className="text-xs text-slate-500">Click rate</dt>
                          <dd className="font-semibold">{percent(campaign.clickRate)}</dd>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <dt className="text-xs text-slate-500">Unsubscribed</dt>
                          <dd className="font-semibold">{countLabel(campaign.unsubscribed)}</dd>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2">
                          <dt className="text-xs text-slate-500">Bounced</dt>
                          <dd className="font-semibold">{countLabel(campaign.bounced)}</dd>
                        </div>
                      </dl>
                      <div className="mt-2 rounded-xl bg-white px-3 py-2 text-sm">
                        <div className="text-xs text-slate-500">Signups</div>
                        {campaign.signups == null ? <div className="font-semibold">—</div> : (
                          <div>
                            <div className="text-lg font-semibold">{campaign.signups.total.toLocaleString('en-CA')}</div>
                            {campaign.signups.pages.map((page) => (
                              <div key={page.name} className="text-slate-600">{page.name} {page.count}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void viewDesign(account.id, campaign)}
                          className="min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-emerald-800"
                        >
                          View design
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyLink(account.id, campaign)}
                          className="min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-emerald-800"
                        >
                          {copiedId === campaign.id ? 'Copied' : 'Copy link'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {report && report.campaigns.length > 0 && (
                <div className="mt-4 hidden overflow-x-auto md:block">
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
                                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                              >
                                View design
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyLink(account.id, campaign)}
                                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                              >
                                {copiedId === campaign.id ? 'Copied' : 'Copy link'}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 pr-3">{percent(campaign.openRate)}</td>
                          <td className="py-3 pr-3">{percent(campaign.clickRate)}</td>
                          <td className="py-3 pr-3">{countLabel(campaign.unsubscribed)}</td>
                          <td className="py-3 pr-3">{countLabel(campaign.bounced)}</td>
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
              </div>
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
                      className="rounded-full bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
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
