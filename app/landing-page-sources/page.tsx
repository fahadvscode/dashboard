'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { LandingPageSource } from '@/lib/landingPageSources'

type FormState = {
  table_name: string
  display_name: string
  page_name: string
  site_url: string
  name_style: 'auto' | 'firstname' | 'first_name'
  has_crm: boolean
  enabled: boolean
}

const emptyForm: FormState = {
  table_name: '',
  display_name: '',
  page_name: '',
  site_url: '',
  name_style: 'auto',
  has_crm: false,
  enabled: true,
}

export default function LandingPageSourcesPage() {
  const [sources, setSources] = useState<LandingPageSource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [sql, setSql] = useState('')
  const [sqlTable, setSqlTable] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/landing-page-sources?fresh=1')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setSources(data.sources || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    setVerifyMsg(null)
    try {
      const res = await fetch('/api/landing-page-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      setSql(data.sql || '')
      setSqlTable(form.table_name.trim().toLowerCase())
      setMessage(
        data.verify?.ok
          ? `Saved “${form.display_name}”. Table verified. Run the SQL below in Supabase (if trigger not already installed).`
          : `Saved “${form.display_name}”. ${data.verify?.message || 'Create the lead table first, then run the SQL below.'}`
      )
      if (data.verify?.message) setVerifyMsg(data.verify.message)
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function showSql(tableName: string, displayName?: string) {
    setError(null)
    const res = await fetch('/api/landing-page-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sql',
        table_name: tableName,
        display_name: displayName,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Could not generate SQL')
      return
    }
    setSql(data.sql || '')
    setSqlTable(tableName)
    setMessage(`SQL ready for ${tableName}`)
  }

  async function verify(tableName: string) {
    setVerifyMsg(null)
    const res = await fetch('/api/landing-page-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', table_name: tableName }),
    })
    const data = await res.json()
    setVerifyMsg(data.message || (data.ok ? 'OK' : 'Failed'))
  }

  async function toggleEnabled(source: LandingPageSource) {
    if (!source.from_db && !source.id) {
      setError('Add this source to the registry first (re-save with the same table name) before toggling.')
      return
    }
    const res = await fetch('/api/landing-page-sources', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: source.table_name, enabled: !source.enabled }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Update failed')
      return
    }
    await load()
  }

  async function removeSource(tableName: string) {
    if (!confirm(`Remove ${tableName} from the registry? (Does not drop the lead table.)`)) return
    const res = await fetch(`/api/landing-page-sources?table=${encodeURIComponent(tableName)}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Delete failed')
      return
    }
    await load()
  }

  async function copySql() {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Landing Page Sources</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Register a Supabase lead table once. New inserts get email, SMS, and Google Sheet rows after you
              run the generated trigger SQL. Leads appear on Landing Pages Leads automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        )}
        {verifyMsg && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {verifyMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Plus className="h-5 w-5" />
            Add / update source
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Table name *</span>
              <input
                required
                value={form.table_name}
                onChange={(e) => setForm((f) => ({ ...f, table_name: e.target.value }))}
                placeholder="my_project_leads"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Must already exist in Supabase. Lowercase + underscores only.
              </span>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Display name *</span>
              <input
                required
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="My Project"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Sheet page name</span>
              <input
                value={form.page_name}
                onChange={(e) => setForm((f) => ({ ...f, page_name: e.target.value }))}
                placeholder="Defaults to display name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Site URL</span>
              <input
                value={form.site_url}
                onChange={(e) => setForm((f) => ({ ...f, site_url: e.target.value }))}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Name columns</span>
              <select
                value={form.name_style}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name_style: e.target.value as FormState['name_style'],
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="auto">Auto-detect</option>
                <option value="firstname">firstname / lastname</option>
                <option value="first_name">first_name / last_name</option>
              </select>
            </label>
            <div className="flex flex-col justify-end gap-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.has_crm}
                  onChange={(e) => setForm((f) => ({ ...f, has_crm: e.target.checked }))}
                />
                Has CRM columns (call_count / lead_temperature)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
                Enabled (notifications + listing)
              </label>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Expected fields: first name, last name, email, phone, plus optional is_broker / is_realtor, project_name,
            source, form_location, notes, etc.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save &amp; generate SQL
          </button>
        </form>

        {sql && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Supabase SQL — {sqlTable || 'trigger + RLS'}
              </h2>
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
            <p className="mb-3 text-sm text-amber-900">
              Paste into Supabase → SQL Editor → Run. Safe to re-run. Does not delete leads or change columns.
            </p>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">{sql}</pre>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Registered sources</h2>
            <p className="text-sm text-gray-500">
              Run <code className="rounded bg-gray-100 px-1">setup_landing_page_lead_sources.sql</code> once if this
              list fails to save new rows.
            </p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sources.map((source) => (
                <li
                  key={source.table_name}
                  className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {source.display_name}
                      {!source.enabled && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          disabled
                        </span>
                      )}
                      {source.builtin && (
                        <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          built-in
                        </span>
                      )}
                      {source.from_db && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          registry
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-gray-500">{source.table_name}</div>
                    {source.site_url && (
                      <div className="mt-0.5 truncate text-xs text-gray-500">{source.site_url}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => showSql(source.table_name, source.display_name)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Setup SQL
                    </button>
                    <button
                      type="button"
                      onClick={() => verify(source.table_name)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Verify table
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(source)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {source.enabled ? 'Disable' : 'Enable'}
                    </button>
                    {source.from_db && (
                      <button
                        type="button"
                        onClick={() => removeSource(source.table_name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
