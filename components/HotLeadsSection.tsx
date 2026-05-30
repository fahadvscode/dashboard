'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flame, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import HotLeadCard from '@/components/HotLeadCard'
import HotLeadsAddModal from '@/components/HotLeadsAddModal'
import { type HotLead, type HotLeadPriority, HOT_LEAD_PRIORITIES } from '@/lib/hotLeads'

export default function HotLeadsSection() {
  const [leads, setLeads] = useState<HotLead[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/hot-leads')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load hot leads')
      setLeads(data.leads ?? [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load hot leads')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const summary = useMemo(() => {
    const urgent = leads.filter((l) => l.priority === 'urgent').length
    const active = leads.filter((l) => l.priority === 'active').length
    const newest = leads.filter((l) => l.priority === 'new').length
    return { urgent, active, newest, total: leads.length }
  }, [leads])

  const patchLead = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/hot-leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Update failed')
    return data.lead as HotLead
  }

  const handlePriorityChange = async (id: string, priority: HotLeadPriority) => {
    try {
      const updated = await patchLead(id, { priority })
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)))
    } catch (e) {
      console.error(e)
    }
  }

  const handleNotesChange = async (id: string, notes: string) => {
    try {
      const updated = await patchLead(id, { notes })
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)))
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/hot-leads/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      setLeads((prev) => prev.filter((l) => l.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const reorder = async (id: string, direction: 'up' | 'down') => {
    const index = leads.findIndex((l) => l.id === id)
    if (index < 0) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= leads.length) return

    const next = [...leads]
    const a = next[index]
    const b = next[swapIndex]
    next[index] = { ...b, sort_order: a.sort_order }
    next[swapIndex] = { ...a, sort_order: b.sort_order }
    setLeads(next)

    try {
      await Promise.all([
        patchLead(a.id, { sort_order: b.sort_order }),
        patchLead(b.id, { sort_order: a.sort_order }),
      ])
      await fetchLeads()
    } catch (e) {
      console.error(e)
      await fetchLeads()
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Hot Leads</h2>
            {!collapsed && leads.length > 0 && (
              <p className="text-xs text-gray-500">
                {summary.urgent} call now · {summary.active} in progress · {summary.newest} new
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-4 w-4" />
                Show ({summary.total})
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide
              </>
            )}
          </button>
        </div>
      </div>

      {collapsed ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          {summary.total === 0
            ? 'No hot leads yet. Click Add to pin leads you are working on.'
            : `${summary.total} hot lead${summary.total === 1 ? '' : 's'} · ${summary.urgent} urgent`}
        </p>
      ) : (
        <>
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading hot leads…
            </div>
          )}

          {!loading && loadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Could not load Hot Leads</p>
              <p className="mt-1 text-amber-800">{loadError}</p>
              <p className="mt-2 text-xs text-amber-700">
                Run <code className="rounded bg-amber-100 px-1">database/setup_hot_leads.sql</code> in
                Supabase if you have not set up the table yet. See HOT_LEADS_SETUP.md.
              </p>
            </div>
          )}

          {!loading && !loadError && leads.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
              <Flame className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 font-medium text-gray-700">No hot leads yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Add leads from your dashboard or enter them manually to track who you are working on.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Add your first hot lead
              </button>
            </div>
          )}

          {!loading && !loadError && leads.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead, index) => (
                <HotLeadCard
                  key={lead.id}
                  lead={lead}
                  isFirst={index === 0}
                  isLast={index === leads.length - 1}
                  onPriorityChange={handlePriorityChange}
                  onNotesChange={handleNotesChange}
                  onRemove={handleRemove}
                  onMoveUp={() => reorder(lead.id, 'up')}
                  onMoveDown={() => reorder(lead.id, 'down')}
                />
              ))}
            </div>
          )}

          {!loading && leads.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
              {(Object.keys(HOT_LEAD_PRIORITIES) as HotLeadPriority[]).map((p) => {
                const cfg = HOT_LEAD_PRIORITIES[p]
                return (
                  <span key={p} className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
                    {cfg.label}
                  </span>
                )
              })}
            </div>
          )}
        </>
      )}

      <HotLeadsAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => {
          setLoading(true)
          fetchLeads()
        }}
      />
    </section>
  )
}
