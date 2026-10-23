'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'

type Action = 'try_again' | 'monthly' | 'dnd'

const ACTIONS: Array<{ id: Action; label: string }> = [
  { id: 'try_again', label: 'Try Again' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'dnd', label: 'DND' },
]

export default function FubLeadFlags({
  context,
  signature,
  onNamed,
}: {
  context: string
  signature: string
  onNamed?: (firstName: string, lastName: string) => void
}) {
  const [busy, setBusy] = useState<Action | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function apply(action: Action) {
    setBusy(action)
    setNotice('')
    setError('')
    try {
      const response = await fetch('/api/fub/lead-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, signature, action }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not update this lead.')
      if (action === 'dnd') onNamed?.(String(payload.firstName || ''), String(payload.lastName || ''))
      setNotice(payload.message || 'Saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this lead.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={box}>
      <div style={row}>
        {ACTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void apply(item.id)}
            style={item.id === 'dnd' ? dndButton : button}
          >
            {busy === item.id ? 'Saving…' : item.label}
          </button>
        ))}
      </div>
      {notice ? <div style={noticeText}>{notice}</div> : null}
      {error ? <div style={errorText}>{error}</div> : null}
    </div>
  )
}

const box: CSSProperties = {
  marginBottom: 12,
}

const row: CSSProperties = {
  display: 'flex',
  gap: 8,
}

const button: CSSProperties = {
  flex: 1,
  border: '1px solid #d0d5dd',
  background: '#fff',
  color: '#1f2933',
  borderRadius: 8,
  padding: '10px 8px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const dndButton: CSSProperties = {
  ...button,
  borderColor: '#b42318',
  color: '#b42318',
  background: '#fff',
}

const noticeText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#026e56',
  lineHeight: 1.4,
}

const errorText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#b42318',
  lineHeight: 1.4,
}
