'use client'

import { Calendar } from 'lucide-react'
import type { LeadDatePreset } from '@/lib/leadDateRange'

interface LeadDateRangeFilterProps {
  preset: LeadDatePreset
  onPresetChange: (p: LeadDatePreset) => void
  customStart: string
  customEnd: string
  onCustomStartChange: (v: string) => void
  onCustomEndChange: (v: string) => void
}

const PRESETS: { key: LeadDatePreset; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'custom', label: 'Custom' }
]

export default function LeadDateRangeFilter({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange
}: LeadDateRangeFilterProps) {
  return (
    <div className="space-y-3 pt-1 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created date</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-all ${
              preset === key
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Calendar className="h-3.5 w-3.5 text-gray-400" aria-hidden />
              From
            </span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="input min-h-[42px] text-gray-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span className="font-medium text-gray-700">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="input min-h-[42px] text-gray-900"
            />
          </label>
          <p className="text-xs text-gray-500 sm:pb-2.5">
            Inclusive. Pick both dates to filter.
          </p>
        </div>
      )}
    </div>
  )
}
