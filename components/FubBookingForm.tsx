'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { APPOINTMENT_TIME_SLOTS, formatAppointmentTimeDisplay } from '@/lib/bookingTimes'
import { FUB_BOOKING_BRANDS, FUB_MEETING_TYPES } from '@/lib/fubEmbeddedApp'
import { meetingTypeLabel, parseMeetingType } from '@/lib/meetingTypes'
import { BOOKED_BY_OPTIONS } from '@/lib/bookedBy'
import type { FubAppointment, FubProjectOption } from '@/lib/fubProjects'
import FubEscalationPanel from '@/components/FubEscalationPanel'
import FubFollowUpPanel from '@/components/FubFollowUpPanel'

type Props = {
  context: string
  signature: string
  firstName: string
  lastName: string
  email: string
  phone: string
  taggedProjects: FubProjectOption[]
  appointments: FubAppointment[]
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
  taggedProjects,
  appointments: initialAppointments,
}: Props) {
  const minDate = useMemo(() => todayToronto(), [])
  const [brand, setBrand] = useState('fj')
  const [type, setType] = useState('phone_call')
  const [bookedBy, setBookedBy] = useState('')
  const [date, setDate] = useState(minDate)
  const [time, setTime] = useState('10:00 AM')
  const [selected, setSelected] = useState<FubProjectOption | null>(taggedProjects[0] ?? null)
  const [changingProject, setChangingProject] = useState(taggedProjects.length === 0)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<FubProjectOption[]>([])
  const [contactEmail, setContactEmail] = useState(email)
  const [contactPhone, setContactPhone] = useState(phone)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [appointments, setAppointments] = useState(initialAppointments)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState(minDate)
  const [editTime, setEditTime] = useState('10:00 AM')
  const [editType, setEditType] = useState('phone_call')
  const [busyId, setBusyId] = useState<string | null>(null)

  const name = `${firstName} ${lastName}`.trim() || 'this lead'

  async function reloadAppointments() {
    const response = await fetch('/api/fub/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, signature }),
    })
    const payload = await response.json()
    if (Array.isArray(payload.appointments)) setAppointments(payload.appointments)
  }

  useEffect(() => {
    const q = search.trim()
    if (q.length < 1) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await fetch('/api/fub/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, signature, q }),
        })
        const payload = await response.json()
        setSuggestions(Array.isArray(payload.projects) ? payload.projects : [])
      })()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, context, signature])

  function chooseProject(project: FubProjectOption) {
    setSelected(project)
    setSearch('')
    setSuggestions([])
    setChangingProject(false)
  }

  async function book() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/fub/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          signature,
          brand,
          type,
          bookedBy,
          date,
          time,
          project: selected?.project_name || search.trim(),
          projectId: selected?.id || '',
          email: contactEmail,
          phone: contactPhone,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        if (payload.needsOverride) {
          const proceed = window.confirm(
            `This person already has ${payload.count || 3} bookings.\n\n${payload.error || 'Contact +1 4163994289 to book an appointment'}\n\nBook anyway from the dashboard?`
          )
          if (!proceed) return
          const retry = await fetch('/api/fub/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              context,
              signature,
              brand,
              type,
              bookedBy,
              date,
              time,
              project: selected?.project_name || search.trim(),
              projectId: selected?.id || '',
              email: contactEmail,
              phone: contactPhone,
              override: true,
            }),
          })
          const retryPayload = await retry.json()
          if (!retry.ok) throw new Error(retryPayload.error || 'Could not book this meeting.')
          setNotice(retryPayload.message || 'Meeting booked.')
          await reloadAppointments()
          return
        }
        throw new Error(payload.error || 'Could not book this meeting.')
      }
      setNotice(payload.message || 'Meeting booked.')
      await reloadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book this meeting.')
    } finally {
      setSaving(false)
    }
  }

  async function cancelAppointment(item: FubAppointment) {
    setBusyId(item.id)
    setError('')
    try {
      const response = await fetch('/api/fub/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, signature, table: item.table, bookingId: item.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not cancel.')
      setNotice(payload.calendarWarning || 'Appointment cancelled. Calendar invite was updated.')
      setEditingId(null)
      setConfirmingId(null)
      await reloadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel.')
    } finally {
      setBusyId(null)
    }
  }

  async function rescheduleAppointment(
    item: FubAppointment,
    next?: { date?: string; time?: string; type?: string }
  ) {
    setBusyId(item.id)
    setError('')
    const appointment_date = next?.date ?? editDate
    const appointment_time = next?.time ?? editTime
    const appointment_type = next?.type ?? editType
    try {
      const response = await fetch('/api/fub/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          signature,
          table: item.table,
          bookingId: item.id,
          appointment_date,
          appointment_time,
          appointment_type,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not update appointment.')
      setNotice(payload.calendarWarning || 'Appointment updated. Calendar invite was updated.')
      setEditingId(null)
      await reloadAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update appointment.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2933', marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 12, color: '#667085', marginBottom: 12 }}>
        Three separate actions: Escalation, Follow-up, then Booking
      </div>

      <FubEscalationPanel context={context} signature={signature} leadName={name} />
      <FubFollowUpPanel context={context} signature={signature} />

      <div style={bookingBox}>
      <div style={bookingHeaderBar}>
        <span style={bookingStep}>3</span>
        Booking
      </div>
      <div style={bookingInner}>
      <div style={bookingHint}>Meeting with the lead. Calendar invite and messages go to them.</div>
      {appointments.length > 0 ? (
        <>
          <div style={label}>Upcoming</div>
          {appointments.map((item) => (
            <div key={`${item.table}-${item.id}`} style={apptCard}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.project_name}</div>
              <div style={{ fontSize: 12, color: '#667085', margin: '4px 0 8px' }}>
                {item.appointment_date} · {formatAppointmentTimeDisplay(item.appointment_time)} · {item.brand}
                {item.booked_by ? ` · Booked by ${item.booked_by}` : ''}
              </div>
              {editingId === item.id ? (
                <>
                  <label style={label}>Type</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value)} style={input}>
                    {FUB_MEETING_TYPES.map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>
                        {meeting.label}
                      </option>
                    ))}
                  </select>
                  <label style={label}>Date</label>
                  <input type="date" min={minDate} value={editDate} onChange={(e) => setEditDate(e.target.value)} style={input} />
                  <label style={label}>Time</label>
                  <select value={editTime} onChange={(e) => setEditTime(e.target.value)} style={input}>
                    {APPOINTMENT_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      type="button"
                      disabled={
                        busyId === item.id ||
                        (editDate === item.appointment_date &&
                          editTime === item.appointment_time &&
                          editType === (parseMeetingType(item.appointment_type) || 'phone_call'))
                      }
                      onClick={() => void rescheduleAppointment(item)}
                      style={smallPrimary}
                    >
                      {busyId === item.id ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} style={smallGhost}>
                      Back
                    </button>
                  </div>
                </>
              ) : confirmingId === item.id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" disabled={busyId === item.id} onClick={() => void cancelAppointment(item)} style={smallDanger}>
                    {busyId === item.id ? 'Cancelling…' : 'Confirm cancel'}
                  </button>
                  <button type="button" onClick={() => setConfirmingId(null)} style={smallGhost}>
                    Back
                  </button>
                </div>
              ) : (
                <>
                  <label style={label}>Type</label>
                  <select
                    value={parseMeetingType(item.appointment_type) || 'phone_call'}
                    disabled={busyId === item.id}
                    onChange={(e) => {
                      void rescheduleAppointment(item, {
                        date: item.appointment_date,
                        time: item.appointment_time,
                        type: e.target.value,
                      })
                    }}
                    style={input}
                  >
                    {FUB_MEETING_TYPES.map((meeting) => (
                      <option key={meeting.id} value={meeting.id}>
                        {meeting.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setEditingId(item.id)
                        setConfirmingId(null)
                        setEditDate(item.appointment_date)
                        setEditTime(item.appointment_time)
                        setEditType(parseMeetingType(item.appointment_type) || 'phone_call')
                      }}
                      style={smallPrimary}
                    >
                      Change date / time
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setConfirmingId(item.id)
                        setEditingId(null)
                      }}
                      style={smallDanger}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </>
      ) : null}

      <div style={{ ...label, marginTop: appointments.length > 0 ? 16 : 8 }}>New meeting</div>

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

      <label style={label}>Booked by (internal)</label>
      <select value={bookedBy} onChange={(e) => setBookedBy(e.target.value)} style={input}>
        <option value="">Select who booked this</option>
        {BOOKED_BY_OPTIONS.map((name) => (
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

      <label style={label}>Project</label>
      {selected && !changingProject ? (
        <div style={{ ...input, background: '#eff6ff', borderColor: '#2563eb' }}>
          <div style={{ fontWeight: 600 }}>{selected.project_name}</div>
          <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>
            {selected.id}
            {selected.city ? ` · ${selected.city}` : ''}
          </div>
          <button type="button" onClick={() => setChangingProject(true)} style={linkButton}>
            Change project
          </button>
        </div>
      ) : (
        <>
          {taggedProjects.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {taggedProjects.map((project) => (
                <button key={project.id} type="button" onClick={() => chooseProject(project)} style={input}>
                  <div style={{ fontWeight: 600, textAlign: 'left' }}>{project.project_name}</div>
                </button>
              ))}
            </div>
          ) : null}
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (e.target.value.trim()) setSelected(null)
            }}
            placeholder="Search by project name or ID"
            style={input}
          />
          {suggestions.length > 0 ? (
            <div style={{ border: '1px solid #d0d5dd', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
              {suggestions.map((project) => (
                <button key={project.id} type="button" onClick={() => chooseProject(project)} style={suggestionBtn}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{project.project_name}</div>
                  <div style={{ fontSize: 11, color: '#667085' }}>
                    {project.id}
                    {project.city ? ` · ${project.city}` : ''}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {selected ? (
            <button type="button" onClick={() => setChangingProject(false)} style={linkButton}>
              Use {selected.project_name}
            </button>
          ) : null}
        </>
      )}

      <label style={label}>Email</label>
      <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={input} />

      <label style={label}>Phone</label>
      <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} style={input} />

      {notice ? <div style={noticeText}>{notice}</div> : null}
      {error ? <div style={errorText}>{error}</div> : null}

      <button type="button" onClick={() => void book()} disabled={saving || !date || !time || !bookedBy} style={button}>
        {saving ? 'Booking…' : 'Book meeting'}
      </button>
      </div>
      </div>
    </div>
  )
}

const wrap: CSSProperties = {
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '12px 12px 16px',
  background: '#fff',
  color: '#1f2933',
}

const bookingBox: CSSProperties = {
  border: '2px solid #2563eb',
  borderRadius: 10,
  padding: 0,
  background: '#eff6ff',
  overflow: 'hidden',
}

const bookingHeaderBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#2563eb',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0.2,
  padding: '10px 12px',
}

const bookingStep: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: 999,
  background: '#fff',
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 800,
  flexShrink: 0,
}

const bookingInner: CSSProperties = {
  padding: '10px 12px 14px',
}

const bookingHint: CSSProperties = {
  fontSize: 12,
  color: '#1e40af',
  margin: '0 0 4px',
  lineHeight: 1.4,
  fontWeight: 600,
}

const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#1e40af',
  margin: '8px 0 4px',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #93c5fd',
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
  background: '#1d4ed8',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const apptCard: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 10,
  marginBottom: 8,
}

const smallPrimary: CSSProperties = {
  flex: 1,
  border: 'none',
  borderRadius: 8,
  padding: '8px 10px',
  background: '#2563eb',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const smallDanger: CSSProperties = {
  ...smallPrimary,
  background: '#b42318',
}

const smallGhost: CSSProperties = {
  ...smallPrimary,
  background: '#f2f4f7',
  color: '#344054',
}

const linkButton: CSSProperties = {
  marginTop: 6,
  border: 'none',
  background: 'none',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 600,
  padding: 0,
  cursor: 'pointer',
}

const suggestionBtn: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  borderBottom: '1px solid #eef0f3',
  background: '#fff',
  padding: '8px 10px',
  cursor: 'pointer',
}

const errorText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#b42318',
  lineHeight: 1.4,
}

const noticeText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#026e56',
  lineHeight: 1.4,
}
