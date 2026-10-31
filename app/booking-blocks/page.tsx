'use client'

import { useEffect, useState } from 'react'
import { APPOINTMENT_TIME_SLOTS } from '@/lib/bookingTimes'

type ClosedTime = {
  id: string
  date: string
  brand: string
  start: string
  end: string
  label: string
}

const BRANDS = [
  { id: 'all', label: 'All booking pages' },
  { id: 'fj', label: 'FJ' },
  { id: 'precon', label: 'Precon Factory' },
  { id: 'gta', label: 'GTA Lowrise' },
]

function todayToronto() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

function brandLabel(id: string) {
  return BRANDS.find((item) => item.id === id)?.label || id
}

export default function BookingBlocksPage() {
  const [date, setDate] = useState(todayToronto)
  const [start, setStart] = useState('5:00 PM')
  const [end, setEnd] = useState('8:00 PM')
  const [brand, setBrand] = useState('all')
  const [blocks, setBlocks] = useState<ClosedTime[]>([])
  const [ready, setReady] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const response = await fetch('/api/bookings/blocked')
    const payload = await response.json()
    setReady(payload.ready !== false)
    setBlocks(Array.isArray(payload.blocks) ? payload.blocks : [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function save() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/bookings/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, start, end, brand }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not save this closed time.')
      setNotice('Closed. The booking pages will hide this time until it ends.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this closed time.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setError('')
    setNotice('')
    const response = await fetch('/api/bookings/blocked', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || 'Could not remove this closed time.')
      return
    }
    setBlocks((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="mx-auto max-w-lg p-4 pb-28">
      <h1 className="text-2xl font-bold text-gray-900">Closed times</h1>
      <p className="mt-2 text-sm text-gray-600">
        Pick a date and a stretch of time. Those slots come off the booking pages until the end time passes. They open again on their own.
      </p>

      {!ready ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Run setup_booking_blocks.sql in Supabase once. Until then, bookings stay open.
        </p>
      ) : null}

      <label className="mt-5 block text-xs font-semibold text-gray-500">Date</label>
      <input type="date" min={todayToronto()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500">From</label>
          <select value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {APPOINTMENT_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500">Until</label>
          <select value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {APPOINTMENT_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-3 block text-xs font-semibold text-gray-500">Pages</label>
      <select value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
        {BRANDS.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>

      {notice ? <p className="mt-3 text-sm font-semibold text-green-700">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <button type="button" onClick={() => void save()} disabled={saving} className="mt-4 w-full rounded-lg bg-[#024225] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        {saving ? 'Saving…' : 'Close this time'}
      </button>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-gray-400">Open blocks</h2>
      {blocks.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No times are closed.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {blocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-3 px-3 py-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{block.date}</div>
                <div className="text-xs text-gray-500">{block.label} · {brandLabel(block.brand)}</div>
              </div>
              <button type="button" onClick={() => void remove(block.id)} className="text-sm font-semibold text-red-700">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
