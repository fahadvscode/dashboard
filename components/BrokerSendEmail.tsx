'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReportAccountId } from '@/lib/constantContactReportTypes'
import type { ContactListChoice, SavedDraft } from '@/lib/constantContactSend'

const ACCOUNTS: { id: ReportAccountId; name: string }[] = [
  { id: 'primary', name: 'Fahad Javed Real Estate' },
  { id: 'second', name: 'Precon Factory' },
  { id: 'third', name: 'GTA Lowrise' },
]

type DraftDetail = {
  id: string
  name: string
  subject: string
  listIds: string[]
  lists: ContactListChoice[]
}

function savedLabel(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function scheduleLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return value
  return `${match[1]}-${match[2]}-${match[3]} at ${Number(match[4]) % 12 || 12}:${match[5]} ${Number(match[4]) >= 12 ? 'PM' : 'AM'}`
}

export default function BrokerSendEmail({
  accessCode,
  onBack,
  onUnauthorized,
}: {
  accessCode: string
  onBack: () => void
  onUnauthorized: () => void
}) {
  const [account, setAccount] = useState<ReportAccountId>('primary')
  const [drafts, setDrafts] = useState<SavedDraft[]>([])
  const [listNote, setListNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<DraftDetail | null>(null)
  const [opening, setOpening] = useState(false)
  const [subject, setSubject] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [listQuery, setListQuery] = useState('')
  const [when, setWhen] = useState('')
  const [confirm, setConfirm] = useState<'now' | 'schedule' | null>(null)
  const [sending, setSending] = useState(false)
  const [design, setDesign] = useState<{ name: string; subject: string; previewHtml: string } | null>(null)
  const [designLoading, setDesignLoading] = useState(false)
  const [designError, setDesignError] = useState('')
  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setDrafts([])
    setListNote('')
    setDraft(null)
    void (async () => {
      try {
        const response = await fetch(`/api/constant-contact/drafts?account=${account}`, {
          headers: { 'x-broker-code': accessCode },
          signal: controller.signal,
          cache: 'no-store',
        })
        if (response.status === 401) {
          unauthorizedRef.current()
          return
        }
        const body = (await response.json().catch(() => ({}))) as {
          error?: string
          drafts?: SavedDraft[]
          stoppedEarly?: boolean
        }
        if (!response.ok) throw new Error(body.error || 'Could not read the saved drafts.')
        if (controller.signal.aborted) return
        setDrafts(body.drafts || [])
        setListNote(body.stoppedEarly ? 'Showing the newest saved drafts.' : '')
      } catch (loadError) {
        if (controller.signal.aborted) return
        setError(loadError instanceof Error ? loadError.message : 'Could not read the saved drafts.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [account, accessCode])

  const visibleLists = useMemo(() => {
    if (!draft) return []
    const query = listQuery.trim().toLowerCase()
    const rows = draft.lists.filter((list) => !query || list.name.toLowerCase().includes(query))
    return [...rows].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)) || a.name.localeCompare(b.name))
  }, [draft, listQuery, selected])

  const selectedNames = draft?.lists.filter((list) => selected.includes(list.id)).map((list) => list.name) || []

  async function openDraft(id: string) {
    setOpening(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/constant-contact/drafts?account=${account}&campaign=${id}`, {
        headers: { 'x-broker-code': accessCode },
        cache: 'no-store',
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      const body = (await response.json().catch(() => ({}))) as DraftDetail & { error?: string }
      if (!response.ok) throw new Error(body.error || 'Could not open this draft.')
      setDraft(body)
      setSubject(body.subject || '')
      setSelected(body.listIds || [])
      setListQuery('')
      setWhen('')
      setConfirm(null)
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open this draft.')
    } finally {
      setOpening(false)
    }
  }

  async function launch(mode: 'now' | 'schedule') {
    if (!draft) return
    setSending(true)
    setError('')
    try {
      const response = await fetch('/api/constant-contact/drafts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-broker-code': accessCode },
        body: JSON.stringify({
          account,
          campaign: draft.id,
          subject,
          listIds: selected,
          mode,
          at: mode === 'schedule' ? when : undefined,
        }),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(body.error || 'Could not send this email.')
      const sentName = draft.name
      setDraft(null)
      setConfirm(null)
      setNotice(mode === 'now' ? `${sentName} is sending now.` : `${sentName} is scheduled.`)
      setLoading(true)
      const refresh = await fetch(`/api/constant-contact/drafts?account=${account}`, {
        headers: { 'x-broker-code': accessCode },
        cache: 'no-store',
      })
      const refreshed = (await refresh.json().catch(() => ({}))) as { drafts?: SavedDraft[]; error?: string }
      if (refresh.ok) setDrafts(refreshed.drafts || [])
    } catch (sendError) {
      setConfirm(null)
      setError(sendError instanceof Error ? sendError.message : 'Could not send this email.')
    } finally {
      setSending(false)
      setLoading(false)
    }
  }

  async function viewDesign() {
    if (!draft) return
    setDesign({ name: draft.name, subject, previewHtml: '' })
    setDesignError('')
    setDesignLoading(true)
    try {
      const response = await fetch(`/api/constant-contact/email?account=${account}&campaign=${draft.id}`, {
        headers: { 'x-broker-code': accessCode },
        cache: 'no-store',
      })
      if (response.status === 401) {
        unauthorizedRef.current()
        return
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string; name?: string; subject?: string; previewHtml?: string }
      if (!response.ok) throw new Error(body.error || 'Could not open this design.')
      setDesign({
        name: body.name || draft.name,
        subject: body.subject || subject,
        previewHtml: body.previewHtml || '',
      })
      if (!body.previewHtml) setDesignError('This draft has no design yet.')
    } catch (viewError) {
      setDesignError(viewError instanceof Error ? viewError.message : 'Could not open this design.')
    } finally {
      setDesignLoading(false)
    }
  }

  function toggleList(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={() => (draft ? setDraft(null) : onBack())}
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-700"
          >
            Back
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{draft ? draft.name : 'Send email'}</h1>
        </div>
      </header>

      <main className={`mx-auto max-w-3xl space-y-4 px-4 py-4 ${draft ? 'pb-36' : ''}`}>
        {!draft && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ACCOUNTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setNotice('')
                  setAccount(item.id)
                }}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${account === item.id ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-800'}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {notice && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{notice}</p>}
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading && !draft && <p className="text-sm text-slate-500">Reading saved drafts…</p>}
        {opening && <p className="text-sm text-slate-500">Opening the draft…</p>}

        {!draft && !loading && !opening && drafts.length === 0 && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
            <p className="font-semibold text-slate-900">No saved drafts</p>
            <p className="mt-1 text-sm text-slate-500">Save a draft in this account, then it will show up here.</p>
          </div>
        )}

        {!draft && !loading && drafts.length > 0 && (
          <div className="space-y-2">
            {listNote && <p className="text-sm text-slate-500">{listNote}</p>}
            {drafts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openDraft(item.id)}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
              >
                <span className="block text-base font-semibold text-slate-900">{item.name}</span>
                {savedLabel(item.updatedAt) && <span className="mt-1 block text-sm text-slate-500">Saved {savedLabel(item.updatedAt)}</span>}
              </button>
            ))}
          </div>
        )}

        {draft && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Subject line</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={() => void viewDesign()}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white text-base font-semibold text-slate-900"
            >
              View design
            </button>

            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-800">List</h2>
                <span className="text-sm text-slate-500">{selected.length} selected</span>
              </div>
              <input
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
                placeholder="Find a list"
                className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 px-4 text-base"
              />
              <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
                {visibleLists.map((list) => {
                  const on = selected.includes(list.id)
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => toggleList(list.id)}
                      aria-pressed={on}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left ${on ? 'bg-emerald-50' : ''}`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white'}`}>
                        {on ? '✓' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">{list.name}</span>
                        {list.count != null && <span className="block text-xs text-slate-500">{list.count.toLocaleString('en-CA')} contacts</span>}
                      </span>
                    </button>
                  )
                })}
                {visibleLists.length === 0 && <p className="py-4 text-sm text-slate-500">No list with that name.</p>}
              </div>
            </section>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Schedule</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base"
              />
              <span className="mt-1 block text-sm text-slate-500">Toronto time. Leave this empty to send now.</span>
            </label>
          </>
        )}
      </main>

      {draft && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-3xl gap-2">
            <button
              type="button"
              disabled={sending || !when || selected.length === 0 || !subject.trim()}
              onClick={() => setConfirm('schedule')}
              className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 disabled:opacity-40"
            >
              Schedule
            </button>
            <button
              type="button"
              disabled={sending || selected.length === 0 || !subject.trim()}
              onClick={() => setConfirm('now')}
              className="min-h-14 flex-1 rounded-2xl bg-emerald-700 text-base font-semibold text-white disabled:opacity-40"
            >
              Send now
            </button>
          </div>
        </div>
      )}

      {confirm && draft && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center" onClick={() => !sending && setConfirm(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900">{confirm === 'now' ? 'Send this email now?' : 'Schedule this email?'}</h2>
            <p className="mt-2 text-sm text-slate-600">{draft.name}</p>
            <p className="mt-3 text-sm text-slate-800"><span className="font-semibold">Subject. </span>{subject.trim()}</p>
            <p className="mt-1 text-sm text-slate-800"><span className="font-semibold">List. </span>{selectedNames.join(', ') || 'None'}</p>
            {confirm === 'schedule' && <p className="mt-1 text-sm text-slate-800"><span className="font-semibold">When. </span>{scheduleLabel(when)} Toronto</p>}
            {confirm === 'now' && <p className="mt-3 text-sm text-slate-500">This sends immediately. A time in the schedule box is not used.</p>}
            <button
              type="button"
              onClick={() => void viewDesign()}
              className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 text-sm font-semibold text-slate-800"
            >
              View design
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void launch(confirm)}
              className="mt-5 min-h-14 w-full rounded-2xl bg-emerald-700 text-base font-semibold text-white disabled:opacity-50"
            >
              {sending ? 'Sending…' : confirm === 'now' ? 'Send now' : 'Schedule'}
            </button>
            <button type="button" disabled={sending} onClick={() => setConfirm(null)} className="mt-2 min-h-11 w-full text-sm font-semibold text-slate-600">
              Go back
            </button>
          </div>
        </div>
      )}

      {design && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center" onClick={() => setDesign(null)}>
          <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{design.name}</h2>
                {design.subject && <p className="mt-1 text-sm text-slate-500">{design.subject}</p>}
              </div>
              <button type="button" onClick={() => setDesign(null)} className="min-h-11 px-2 text-sm font-semibold text-slate-600">Close</button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {designLoading && <p className="text-sm text-slate-500">Opening the design…</p>}
              {designError && <p className="text-sm text-red-700">{designError}</p>}
              {design.previewHtml && (
                <iframe title={design.name} sandbox="" srcDoc={design.previewHtml} className="h-[65dvh] w-full rounded-2xl border border-slate-200 bg-white" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
