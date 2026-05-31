'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Search, UserPlus, Loader2, Calendar, User } from 'lucide-react'
import {
  type ContactSearchResult,
  CONTACT_SOURCE_TABLES,
  type ContactSourceTable,
} from '@/lib/hotLeads'

type Tab = 'search' | 'manual'

interface HotLeadsAddModalProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
}

export default function HotLeadsAddModal({ open, onClose, onAdded }: HotLeadsAddModalProps) {
  const [tab, setTab] = useState<Tab>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContactSearchResult[]>([])
  const [searchMode, setSearchMode] = useState<'suggestions' | 'search'>('suggestions')
  const [searchHint, setSearchHint] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualNote, setManualNote] = useState('')

  const resetForm = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSearchMode('suggestions')
    setSearchHint(null)
    setManualName('')
    setManualPhone('')
    setManualEmail('')
    setManualNote('')
    setError(null)
    setHighlightIndex(-1)
    setTab('search')
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }
    inputRef.current?.focus()
  }, [open, resetForm])

  const runSearch = useCallback(async (q: string) => {
    setSearching(true)
    setError(null)
    setSearchHint(null)
    try {
      const url = q.trim()
        ? `/api/hot-leads/search?q=${encodeURIComponent(q.trim())}`
        : '/api/hot-leads/search'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setSearchResults(data.results ?? [])
      setSearchMode(data.mode === 'search' ? 'search' : 'suggestions')
      setSearchHint(data.hint ?? null)
      setHighlightIndex(-1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!open || tab !== 'search') return

    const q = searchQuery.trim()
    const timer = setTimeout(() => {
      runSearch(q)
    }, q ? 250 : 0)

    return () => clearTimeout(timer)
  }, [searchQuery, open, tab, runSearch])

  const defaultNoteForResult = (result: ContactSearchResult): string | null => {
    if (result.suggestion_tag === 'meeting_passed') {
      return `Follow up after meeting — ${result.activity_summary}`
    }
    if (result.suggestion_tag === 'meeting_today') {
      return `Meeting today — ${result.activity_summary}`
    }
    return null
  }

  const addLinked = async (result: ContactSearchResult) => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/hot-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'linked',
          source_table: result.source_table,
          source_id: result.source_id,
          display_name: result.display_name,
          phone: result.phone,
          email: result.email,
          project_name: result.project_name,
          notes: defaultNoteForResult(result),
          priority: result.suggestion_tag === 'meeting_passed' ? 'active' : 'new',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add lead')
      onAdded()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add lead')
    } finally {
      setSubmitting(false)
    }
  }

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName.trim()) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/hot-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'manual',
          display_name: manualName.trim(),
          phone: manualPhone.trim() || null,
          email: manualEmail.trim() || null,
          notes: manualNote.trim() || null,
          priority: 'new',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add lead')
      onAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lead')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < searchResults.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : searchResults.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      addLinked(searchResults[highlightIndex])
    }
  }

  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex])

  if (!open) return null

  const listTitle =
    searchMode === 'suggestions' && !searchQuery.trim()
      ? 'Suggestions — past meetings & recent leads'
      : 'Matches — most recent first'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-labelledby="hot-leads-add-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="hot-leads-add-title" className="text-lg font-semibold text-gray-900">
            Add to Hot Leads
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${
              tab === 'search'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="h-4 w-4" />
            From dashboard
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium ${
              tab === 'manual'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Manual entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {tab === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Name, email, or phone…"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={searchResults.length > 0}
                  aria-controls="hot-leads-search-list"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-gray-500">
                Searches every lead table and all bookings (FJ, Precon, GTA Lowrise, rental,
                landing pages). Open the modal with an empty search to see people whose meetings
                already passed — add them as hot leads for follow-up.
              </p>

              {searching && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {searchQuery.trim() ? 'Searching…' : 'Loading suggestions…'}
                </div>
              )}

              {!searching && searchHint && (
                <p className="text-sm text-gray-400">{searchHint}</p>
              )}

              {!searching &&
                !searchHint &&
                searchQuery.trim().length >= 1 &&
                searchResults.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No matches found. Try first name only, or check spelling.
                  </p>
                )}

              {!searching && searchResults.length > 0 && (
                <>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {listTitle}
                  </p>
                  <ul
                    id="hot-leads-search-list"
                    ref={listRef}
                    role="listbox"
                    className="max-h-64 space-y-2 overflow-y-auto"
                  >
                    {searchResults.map((r, index) => {
                      const label =
                        CONTACT_SOURCE_TABLES[r.source_table as ContactSourceTable]?.label ??
                        r.source_table
                      const isBooking = r.source_kind === 'booking'
                      const meetingPassed = r.suggestion_tag === 'meeting_passed'
                      const meetingToday = r.suggestion_tag === 'meeting_today'
                      const highlighted = index === highlightIndex

                      return (
                        <li key={`${r.source_table}-${r.source_id}`} role="option">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => addLinked(r)}
                            className={`w-full rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-50 ${
                              highlighted
                                ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                                : meetingPassed
                                  ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-gray-900">{r.display_name}</span>
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                  meetingPassed
                                    ? 'bg-amber-100 text-amber-900'
                                    : meetingToday
                                      ? 'bg-green-100 text-green-800'
                                      : isBooking
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {isBooking ? (
                                  <Calendar className="h-3 w-3" />
                                ) : (
                                  <User className="h-3 w-3" />
                                )}
                                {meetingPassed
                                  ? 'Meeting passed'
                                  : meetingToday
                                    ? 'Today'
                                    : isBooking
                                      ? 'Booking'
                                      : 'Lead'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500">
                              <span className="font-medium text-gray-600">{label}</span>
                              {r.phone && <span>{r.phone}</span>}
                              {r.email && <span className="truncate">{r.email}</span>}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-400">{r.activity_summary}</div>
                            {r.project_name && (
                              <div className="mt-0.5 truncate text-xs text-gray-400">
                                {r.project_name}
                              </div>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === 'manual' && (
            <form onSubmit={addManual} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Note</label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to Hot Leads
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
