'use client'

import { Calendar } from 'lucide-react'
import {
  BOOKING_DATE_FILTERS,
  type BookingDateFilter,
} from '@/lib/bookingDateFilter'

interface BookingDateFilterBarProps {
  filter: BookingDateFilter
  onFilterChange: (filter: BookingDateFilter) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (value: string) => void
  onCustomToChange: (value: string) => void
}

export default function BookingDateFilterBar({
  filter,
  onFilterChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: BookingDateFilterBarProps) {
  return (
    <div className="mb-6 space-y-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Appointment date</p>
      <div className="flex flex-wrap gap-2">
        {BOOKING_DATE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-all ${
              filter === key
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {filter === 'custom' && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Calendar className="h-3.5 w-3.5 text-gray-400" aria-hidden />
              From
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="input min-h-[42px] text-gray-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            <span className="font-medium text-gray-700">To</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="input min-h-[42px] text-gray-900"
            />
          </label>
        </div>
      )}
    </div>
  )
}
