'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  FOLLOW_UP_ASSIGNEES,
  FOLLOW_UP_SLOTS,
  FOLLOW_UP_STAFF,
  defaultFollowUpAssignee,
  orderFollowUpAssignees,
  type FollowUpFubUser,
} from '@/lib/followUpTasks'

function todayToronto() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
}

const FALLBACK_USERS: FollowUpFubUser[] = FOLLOW_UP_ASSIGNEES.map((name, index) => ({
  id: -(index + 1),
  name,
}))

export default function FubFollowUpPanel({
  context,
  signature,
  currentUser,
}: {
  context: string
  signature: string
  currentUser?: { id?: number; name?: string }
}) {
  const minDate = useMemo(() => todayToronto(), [])
  const [date, setDate] = useState(minDate)
  const [slot, setSlot] = useState<(typeof FOLLOW_UP_SLOTS)[number]>('12 PM')
  const [staff, setStaff] = useState('')
  const [users, setUsers] = useState<FollowUpFubUser[]>(FALLBACK_USERS)
  const [assigneeKey, setAssigneeKey] = useState(assigneeValue(defaultFollowUpAssignee(FALLBACK_USERS, currentUser)))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/fub/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, signature }),
        })
        const payload = (await response.json()) as {
          users?: FollowUpFubUser[]
          currentUser?: { id?: number; name?: string }
        }
        const nextUsers = orderFollowUpAssignees(
          Array.isArray(payload.users) && payload.users.length > 0 ? payload.users : FALLBACK_USERS
        )
        if (cancelled) return
        setUsers(nextUsers)
        setAssigneeKey(
          assigneeValue(
            defaultFollowUpAssignee(nextUsers, payload.currentUser || currentUser)
          )
        )
      } catch {
        if (cancelled) return
        setUsers(FALLBACK_USERS)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [context, signature, currentUser])

  const selected = users.find((user) => assigneeValue(user) === assigneeKey) || users[0] || null

  async function createTask() {
    if (!selected) {
      setError('Choose who this follow-up is assigned to.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/fub/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          signature,
          date,
          slot,
          staff,
          note,
          assignedTo: selected.name,
          assignedUserId: selected.id > 0 ? selected.id : undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not create the follow-up.')
      setNotice(payload.message || 'Follow-up added.')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the follow-up.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={box}>
      <div style={headerBar}>
        <span style={step}>2</span>
        Follow-up
      </div>
      <div style={inner}>
      <div style={hint}>Creates a Follow Up Boss task. 12 PM, 4 PM, or 7 PM — you can add more than one.</div>

      <label style={label}>Date</label>
      <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} style={input} />

      <label style={label}>Slot</label>
      <div style={slotRow}>
        {FOLLOW_UP_SLOTS.map((item) => {
          const active = slot === item
          return (
            <button
              key={item}
              type="button"
              onClick={() => setSlot(item)}
              style={{
                ...slotBtn,
                background: active ? '#6d28d9' : '#fff',
                color: active ? '#fff' : '#5b21b6',
                borderColor: active ? '#6d28d9' : '#c4b5fd',
              }}
            >
              {item}
            </button>
          )
        })}
      </div>

      <label style={label}>Assign to</label>
      <select value={assigneeKey} onChange={(e) => setAssigneeKey(e.target.value)} style={input}>
        {users.map((user) => (
          <option key={assigneeValue(user)} value={assigneeValue(user)}>
            {user.name}
          </option>
        ))}
      </select>
      <div style={fieldHint}>This Follow Up Boss user gets the task.</div>

      <label style={label}>Name</label>
      <select value={staff} onChange={(e) => setStaff(e.target.value)} style={input}>
        <option value="">No name (Follow-up)</option>
        {FOLLOW_UP_STAFF.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div style={fieldHint}>Optional label on the task title (Nisha, Aman, …).</div>

      <label style={label}>Note (optional)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional"
        style={{ ...input, resize: 'vertical', minHeight: 56 }}
      />

      {notice ? <div style={noticeText}>{notice}</div> : null}
      {error ? <div style={errorText}>{error}</div> : null}

      <button
        type="button"
        onClick={() => void createTask()}
        disabled={saving || !date || !slot || !selected}
        style={button}
      >
        {saving ? 'Adding…' : 'Add follow-up'}
      </button>
      </div>
    </div>
  )
}

function assigneeValue(user: FollowUpFubUser | null) {
  if (!user) return ''
  return user.id > 0 ? `id:${user.id}` : `name:${user.name}`
}

const box: CSSProperties = {
  border: '2px solid #7c3aed',
  borderRadius: 10,
  padding: 0,
  margin: '0 0 14px',
  background: '#f5f3ff',
  overflow: 'hidden',
}

const headerBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#7c3aed',
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
  color: '#6d28d9',
  fontSize: 12,
  fontWeight: 800,
  flexShrink: 0,
}

const inner: CSSProperties = {
  padding: '10px 12px 14px',
}

const hint: CSSProperties = {
  fontSize: 12,
  color: '#5b21b6',
  margin: '0 0 4px',
  lineHeight: 1.4,
  fontWeight: 600,
}

const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#5b21b6',
  margin: '8px 0 4px',
}

const fieldHint: CSSProperties = {
  fontSize: 11,
  color: '#6d28d9',
  margin: '4px 0 0',
  lineHeight: 1.35,
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #c4b5fd',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: '#fff',
}

const slotRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 6,
}

const slotBtn: CSSProperties = {
  border: '1px solid #d0d5dd',
  borderRadius: 8,
  padding: '8px 6px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const button: CSSProperties = {
  width: '100%',
  marginTop: 12,
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  background: '#6d28d9',
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
