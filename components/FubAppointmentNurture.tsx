'use client'

import type { CSSProperties } from 'react'
import { NURTURE_ASSIGNEE, NURTURE_TOUCH_COUNT, nurtureOutcomeLabel } from '@/lib/appointmentNurture'
import type { AppointmentNurtureRow, NurtureOutcome } from '@/lib/appointmentNurture'

export type NurtureActionId = NurtureOutcome | 'stop' | 'restart'

export default function FubAppointmentNurture({
  nurture,
  disabled,
  onAction,
}: {
  nurture?: AppointmentNurtureRow | null
  disabled?: boolean
  onAction: (action: NurtureActionId) => void
}) {
  const active = nurture?.status === 'active'
  const stopped = nurture?.status === 'stopped'
  const parked = nurture?.outcome === 'rescheduled' && nurture?.status === 'pending'
  const created = (nurture?.tasks || []).filter((task) => task.fubTaskId).length
  const firstError = (nurture?.tasks || []).find((task) => task.error)?.error
  const firstDue = (nurture?.tasks || []).find((task) => task.fubTaskId)

  return (
    <div style={box}>
      <div style={title}>Appointment nurture</div>
      <div style={hint}>
        Creates {NURTURE_TOUCH_COUNT} internal Follow Up Boss tasks for {NURTURE_ASSIGNEE} only. Does not email or
        text the lead. Touch 1 is due immediately.
      </div>

      {active ? (
        <div style={statusActive}>
          Running · {nurtureOutcomeLabel(nurture?.outcome)} · {created}/{NURTURE_TOUCH_COUNT} tasks
          {firstDue ? ` · Touch ${firstDue.touch} due ${firstDue.dueDate}` : ''}
        </div>
      ) : null}
      {stopped ? (
        <div style={statusStopped}>
          Stopped · {nurtureOutcomeLabel(nurture?.outcome)} · Restart begins at Touch 1
        </div>
      ) : null}
      {parked ? (
        <div style={statusParked}>Rescheduled — no tasks. Mark Done or No show after the new meeting.</div>
      ) : null}
      {firstError ? <div style={statusStopped}>{firstError}</div> : null}

      {!active ? (
        <div style={row}>
          <button type="button" disabled={disabled} onClick={() => onAction('appointment_done')} style={doneBtn}>
            Appointment Done
          </button>
          <button type="button" disabled={disabled} onClick={() => onAction('no_show')} style={noShowBtn}>
            No show
          </button>
          {!parked ? (
            <button type="button" disabled={disabled} onClick={() => onAction('rescheduled')} style={rescheduleBtn}>
              Rescheduled
            </button>
          ) : null}
        </div>
      ) : null}

      {active || stopped ? (
        <div style={row}>
          {active ? (
            <button type="button" disabled={disabled} onClick={() => onAction('stop')} style={stopBtn}>
              Stop nurture
            </button>
          ) : null}
          <button type="button" disabled={disabled} onClick={() => onAction('restart')} style={restartBtn}>
            Restart from Touch 1
          </button>
        </div>
      ) : null}
    </div>
  )
}

const box: CSSProperties = {
  marginTop: 10,
  border: '1px solid #fcd34d',
  borderRadius: 8,
  padding: 8,
  background: '#fffbeb',
}

const title: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: '#92400e',
  letterSpacing: 0.2,
  marginBottom: 4,
}

const hint: CSSProperties = {
  fontSize: 11,
  color: '#b45309',
  lineHeight: 1.35,
  marginBottom: 8,
}

const statusActive: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#166534',
  marginBottom: 8,
}

const statusStopped: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#9a3412',
  marginBottom: 8,
}

const statusParked: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#92400e',
  marginBottom: 8,
}

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
}

const baseBtn: CSSProperties = {
  flex: '1 1 30%',
  border: 'none',
  borderRadius: 8,
  padding: '8px 8px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  color: '#fff',
}

const doneBtn: CSSProperties = { ...baseBtn, background: '#166534' }
const noShowBtn: CSSProperties = { ...baseBtn, background: '#c2410c' }
const rescheduleBtn: CSSProperties = { ...baseBtn, background: '#b45309' }
const stopBtn: CSSProperties = { ...baseBtn, background: '#6b7280' }
const restartBtn: CSSProperties = { ...baseBtn, background: '#1d4ed8' }
