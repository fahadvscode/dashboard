'use client'

import { useState } from 'react'
import { Phone, Mail, ExternalLink, X, ChevronUp, ChevronDown, StickyNote } from 'lucide-react'
import {
  type HotLead,
  type HotLeadPriority,
  HOT_LEAD_PRIORITIES,
  getSourceLabel,
  getSourceRoute,
} from '@/lib/hotLeads'

interface HotLeadCardProps {
  lead: HotLead
  isFirst: boolean
  isLast: boolean
  onPriorityChange: (id: string, priority: HotLeadPriority) => void
  onNotesChange: (id: string, notes: string) => void
  onRemove: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

export default function HotLeadCard({
  lead,
  isFirst,
  isLast,
  onPriorityChange,
  onNotesChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: HotLeadCardProps) {
  const [editingNotes, setEditingNotes] = useState(false)
  const [noteDraft, setNoteDraft] = useState(lead.notes ?? '')
  const priorityConfig = HOT_LEAD_PRIORITIES[lead.priority]
  const sourceLabel = getSourceLabel(lead.source_table, lead.source_type)
  const sourceRoute = getSourceRoute(lead.source_table)

  const saveNotes = () => {
    setEditingNotes(false)
    if (noteDraft !== (lead.notes ?? '')) {
      onNotesChange(lead.id, noteDraft)
    }
  }

  return (
    <div className="relative flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityConfig.dotColor}`}
              title={priorityConfig.label}
            />
            <h3 className="truncate font-semibold text-gray-900">{lead.display_name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${priorityConfig.color}`}>
              {sourceLabel}
            </span>
            {lead.project_name && (
              <span className="truncate text-gray-600">{lead.project_name}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMoveUp(lead.id)}
            disabled={isFirst}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(lead.id)}
            disabled={isLast}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(lead.id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove from hot leads"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(HOT_LEAD_PRIORITIES) as HotLeadPriority[]).map((p) => {
          const cfg = HOT_LEAD_PRIORITIES[p]
          const active = lead.priority === p
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPriorityChange(lead.id, p)}
              title={cfg.label}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition ${
                active
                  ? `${cfg.color} ring-2 ${cfg.ringColor}`
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
              {cfg.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {lead.phone && (
          <a
            href={`tel:${lead.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            {lead.phone}
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex items-center gap-1 truncate text-blue-600 hover:underline"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </a>
        )}
        {lead.source_type === 'linked' && sourceRoute && (
          <a
            href={sourceRoute}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open leads
          </a>
        )}
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your note…"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveNotes}
                className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteDraft(lead.notes ?? '')
                  setEditingNotes(false)
                }}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="flex w-full items-start gap-1.5 text-left text-sm text-gray-600 hover:text-gray-900"
          >
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className={lead.notes ? '' : 'italic text-gray-400'}>
              {lead.notes || 'Add a note…'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
