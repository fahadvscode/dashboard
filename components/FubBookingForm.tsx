'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { APPOINTMENT_TIME_SLOTS } from '@/lib/bookingTimes'
import { FUB_BOOKING_BRANDS, FUB_MEETING_TYPES } from '@/lib/fubEmbeddedApp'

type Props = {
  context: string
  signature: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

function todayToronto() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

export default function FubBookingForm({
  context,
  signature,
  firstName,
  lastName,
  email,
  phone,
}: Props) {
  const minDate = useMemo(() => todayToronto(), [])
  const [brand, setBrand] = useState('fj')
  const [type, setType] = useState('phone_call')
  const [date, setDate] = useState(minDate)
  const [time, setTime] = useState('10:00 AM')
  const [project, setProject] = useState('')
  const [contactEmail, setContactEmail] = useState(email)
  const [contactPhone, setContactPhone] = useState(phone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const name = `${firstName} ${lastName}`.trim() || 'this lead'

  async function book() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/fub/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          signature,
          brand,
          type,
          date,
          time,
          project,
          email: contactEmail,
          phone: contactPhone,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Could not book this meeting.')
      }
      setDone(payload.message || 'Meeting booked.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book this meeting.')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#163a2a', marginBottom: 6 }}>Booked</div>
        <p style={{ margin: 0, fontSize: 13, color: '#3f5b4e', lineHeight: 1.45 }}>{done}</p>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2933', marginBottom: 2 }}>Book a meeting</div>
      <div style={{ fontSize: 12, color: '#667085', marginBottom: 12 }}>{name}</div>

      <label style={label}>Brand</label>
      <select value={brand} onChange={(e) => setBrand(e.target.value)} style={input}>
        {FUB_BOOKING_BRANDS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>

      <label style={label}>Type</label>
      <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
        {FUB_MEETING_TYPES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>

      <label style={label}>Date</label>
      <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} style={input} />

      <label style={label}>Time</label>
      <select value={time} onChange={(e) => setTime(e.target.value)} style={input}>
        {APPOINTMENT_TIME_SLOTS.map((slot) => (
          <option key={slot} value={slot}>
            {slot}
          </option>
        ))}
      </select>

      <label style={label}>Project (optional)</label>
      <input
        value={project}
        onChange={(e) => setProject(e.target.value)}
        placeholder="Project name"
        style={input}
      />

      <label style={label}>Email</label>
      <input
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        style={input}
      />

      <label style={label}>Phone</label>
      <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} style={input} />

      {error ? <div style={errorText}>{error}</div> : null}

      <button type="button" onClick={() => void book()} disabled={saving || !date || !time} style={button}>
        {saving ? 'Booking…' : 'Book meeting'}
      </button>
    </div>
  )
}

const wrap: CSSProperties = {
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '12px 12px 16px',
  background: '#fff',
  color: '#1f2933',
}

const card: CSSProperties = {
  ...wrap,
  padding: 16,
}

const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#667085',
  margin: '8px 0 4px',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #d0d5dd',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: '#fff',
}

const button: CSSProperties = {
  width: '100%',
  marginTop: 14,
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  background: '#2563eb',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const errorText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#b42318',
  lineHeight: 1.4,
}
