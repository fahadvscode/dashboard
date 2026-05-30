'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Search, UserPlus, Loader2 } from 'lucide-react'
import {
  type LeadSearchResult,
  LEAD_SOURCE_TABLES,
  type LeadSourceTable,
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
  const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualNote, setManualNote] = useState('')

  const resetForm = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setManualName('')
    setManualPhone('')
    setManualEmail('')
    setManualNote('')
    setError(null)
    setTab('search')
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
      return
    }
  }, [open, resetForm])

  useEffect(() => {
    if (!open || tab !== 'search') return

    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      setError(null)
      try {
        const res = await fetch(`/api/hot-leads/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Search failed')
        setSearchResults(data.results ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed')
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, open, tab])

  const addLinked = async (result: LeadSearchResult) => {
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
          priority: 'new',
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

  if (!open) return null

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
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or email…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {searching && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              )}
              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-gray-500">No leads found.</p>
              )}
              {searchQuery.trim().length < 2 && (
                <p className="text-sm text-gray-400">Type at least 2 characters to search.</p>
              )}
              <ul className="space-y-2">
                {searchResults.map((r) => (
                  <li key={`${r.source_table}-${r.source_id}`}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => addLinked(r)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <div className="font-medium text-gray-900">{r.display_name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>
                          {LEAD_SOURCE_TABLES[r.source_table as LeadSourceTable]?.label ??
                            r.source_table}
                        </span>
                        {r.phone && <span>{r.phone}</span>}
                        {r.email && <span className="truncate">{r.email}</span>}
                      </div>
                      {r.project_name && (
                        <div className="mt-0.5 truncate text-xs text-gray-400">{r.project_name}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
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
