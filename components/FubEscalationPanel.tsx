'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { APPOINTMENT_TIME_SLOTS } from '@/lib/bookingTimes'
import { ESCALATION_STAFF } from '@/lib/escalations'

function todayToronto() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

export default function FubEscalationPanel({
  context,
  signature,
}: {
  context: string
  signature: string
}) {
  const minDate = useMemo(() => todayToronto(), [])
  const [staff, setStaff] = useState('')
  const [date, setDate] = useState(minDate)
  const [time, setTime] = useState('10:00 AM')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function escalate() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/fub/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, signature, staff, date, time }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not escalate.')
      setNotice(payload.message || 'Escalation added to the calendar.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not escalate.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={box}>
      <div style={headerBar}>
        <span style={step}>1</span>
        Escalation
      </div>
      <div style={inner}>
      <div style={hint}>Internal only. Pick who has to call this lead. No email or SMS to the lead.</div>

      <label style={label}>Escalate to</label>
      <select value={staff} onChange={(e) => setStaff(e.target.value)} style={input}>
        <option value="">Select a name</option>
        {ESCALATION_STAFF.map((name) => (
          <option key={name} value={name}>
            {name}
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

      {notice ? <div style={noticeText}>{notice}</div> : null}
      {error ? <div style={errorText}>{error}</div> : null}

      <button type="button" onClick={() => void escalate()} disabled={saving || !staff || !date || !time} style={button}>
        {saving ? 'Escalating…' : 'Escalate'}
      </button>
      </div>
    </div>
  )
}

const box: CSSProperties = {
  border: '2px solid #ea580c',
  borderRadius: 10,
  padding: 0,
  margin: '0 0 14px',
  background: '#fff7ed',
  overflow: 'hidden',
}

const headerBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#ea580c',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0.2,
  padding: '10px 12px',
}

const step: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: 999,
  background: '#fff',
  color: '#c2410c',
  fontSize: 12,
  fontWeight: 800,
  flexShrink: 0,
}

const inner: CSSProperties = {
  padding: '10px 12px 14px',
}

const hint: CSSProperties = {
  fontSize: 12,
  color: '#9a3412',
  margin: '0 0 4px',
  lineHeight: 1.4,
  fontWeight: 600,
}

const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#9a3412',
  margin: '8px 0 4px',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #fdba74',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: '#fff',
}

const button: CSSProperties = {
  width: '100%',
  marginTop: 12,
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  background: '#c2410c',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const noticeText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#067647',
  fontWeight: 600,
}

const errorText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#b42318',
  fontWeight: 600,
}
