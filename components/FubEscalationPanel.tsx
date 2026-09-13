'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import { ESCALATION_FROM_STAFF, ESCALATION_TO_STAFF, ESCALATION_WHEN } from '@/lib/escalations'

export default function FubEscalationPanel({
  context,
  signature,
  leadName,
}: {
  context: string
  signature: string
  leadName: string
}) {
  const [from, setFrom] = useState('')
  const [staff, setStaff] = useState('')
  const [when, setWhen] = useState<(typeof ESCALATION_WHEN)[number]['id']>('15m')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const displayName = leadName.trim() || 'this lead'

  async function escalate() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/fub/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, signature, from, staff, when }),
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
      <div style={hint}>
        Internal only. Escalating {displayName}. Pick who it is from and who has to call. No email or SMS to the
        lead.
      </div>

      <label style={label}>From</label>
      <select value={from} onChange={(e) => setFrom(e.target.value)} style={input}>
        <option value="">Select a name</option>
        {ESCALATION_FROM_STAFF.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <label style={label}>Escalate to</label>
      <select value={staff} onChange={(e) => setStaff(e.target.value)} style={input}>
        <option value="">Select a name</option>
        {ESCALATION_TO_STAFF.map((name, index) => (
          <option key={name} value={name}>
            {index + 1}. {name}
          </option>
        ))}
      </select>

      <label style={label}>When</label>
      <div style={whenRow}>
        {ESCALATION_WHEN.map((item) => {
          const active = when === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setWhen(item.id)}
              style={{
                ...whenBtn,
                background: active ? '#c2410c' : '#fff',
                color: active ? '#fff' : '#9a3412',
                borderColor: active ? '#c2410c' : '#fdba74',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <div style={fieldHint}>
        {when === '5m'
          ? 'No extra reminder text for 5 minutes.'
          : 'A reminder text goes out 2 minutes before.'}
      </div>

      {notice ? <div style={noticeText}>{notice}</div> : null}
      {error ? <div style={errorText}>{error}</div> : null}

      <button type="button" onClick={() => void escalate()} disabled={saving || !from || !staff || !when} style={button}>
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

const fieldHint: CSSProperties = {
  fontSize: 11,
  color: '#c2410c',
  margin: '4px 0 0',
  lineHeight: 1.35,
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

const whenRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
}

const whenBtn: CSSProperties = {
  border: '1px solid #fdba74',
  borderRadius: 8,
  padding: '8px 6px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
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
