'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, Ban } from 'lucide-react'
import { APPOINTMENT_TIME_SLOTS, normalizeAppointmentTime } from '@/lib/bookingTimes'

type BookingTable = 'fj_bookings' | 'precon_factory_bookings' | 'gta_lowrise_bookings'

interface ManageBooking {
  id: string
  firstname: string
  lastname: string
  appointment_date: string
  appointment_time: string
  phone?: string | null
  status?: string
}

interface BookingReschedulePanelProps {
  booking: ManageBooking
  table: BookingTable
  onRescheduled: (updated: { appointment_date: string; appointment_time: string }) => void
  onCancelled?: (updated: { status: string }) => void
}

export default function BookingReschedulePanel({
  booking,
  table,
  onRescheduled,
  onCancelled,
}: BookingReschedulePanelProps) {
  const [appointmentDate, setAppointmentDate] = useState(booking.appointment_date)
  const [appointmentTime, setAppointmentTime] = useState(
    normalizeAppointmentTime(booking.appointment_time)
  )
  const [sendSms, setSendSms] = useState(true)
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [warning, setWarning] = useState('')

  const isCancelled = String(booking.status || '').toLowerCase() === 'cancelled'

  useEffect(() => {
    setAppointmentDate(booking.appointment_date)
    setAppointmentTime(normalizeAppointmentTime(booking.appointment_time))
    setError('')
    setSuccess('')
    setWarning('')
    setSendSms(true)
  }, [booking.id, booking.appointment_date, booking.appointment_time, booking.status])

  const handleReschedule = async () => {
    if (!appointmentDate || !appointmentTime) {
      setError('Please select a new date and time.')
      return
    }

    setRescheduling(true)
    setError('')
    setSuccess('')
    setWarning('')

    try {
      const response = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table,
          bookingId: booking.id,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          sendSms: sendSms && !!booking.phone,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to reschedule appointment.')
      }

      onRescheduled({
        appointment_date: data.booking.appointment_date,
        appointment_time: data.booking.appointment_time,
      })

      const messages: string[] = ['Appointment rescheduled.']
      if (data.smsSent) messages.push('Confirmation SMS sent.')
      else if (data.smsError) messages.push(`SMS not sent: ${data.smsError}`)
      else if (sendSms && !booking.phone) messages.push('No phone number on file for SMS.')

      setSuccess(messages.join(' '))
      if (data.calendarWarning) {
        setWarning(data.calendarWarning)
      }

      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reschedule appointment.')
    } finally {
      setRescheduling(false)
    }
  }

  const handleCancel = async () => {
    if (
      !confirm(
        `Cancel the appointment for ${booking.firstname} ${booking.lastname} on ${booking.appointment_date} at ${booking.appointment_time}?`
      )
    ) {
      return
    }

    setCancelling(true)
    setError('')
    setSuccess('')
    setWarning('')

    try {
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table,
          bookingId: booking.id,
          sendSms: sendSms && !!booking.phone,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to cancel appointment.')
      }

      onCancelled?.({ status: data.booking.status || 'cancelled' })

      const messages: string[] = ['Appointment cancelled.']
      if (data.smsSent) messages.push('Cancellation SMS sent.')
      else if (data.smsError) messages.push(`SMS not sent: ${data.smsError}`)

      setSuccess(messages.join(' '))
      if (data.calendarWarning) {
        setWarning(data.calendarWarning)
      }

      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel appointment.')
    } finally {
      setCancelling(false)
    }
  }

  const hasChanges =
    appointmentDate !== booking.appointment_date ||
    appointmentTime !== normalizeAppointmentTime(booking.appointment_time)

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Manage Appointment
        </span>
        <CalendarClock className="h-4 w-4 text-amber-700" />
      </div>

      {isCancelled ? (
        <p className="mt-3 text-sm text-red-700 font-medium">
          This appointment is already cancelled.
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">New date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(event) => setAppointmentDate(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">New time</label>
              <select
                value={appointmentTime}
                onChange={(event) => setAppointmentTime(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
              >
                {APPOINTMENT_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={sendSms}
              onChange={(event) => setSendSms(event.target.checked)}
              disabled={!booking.phone}
              className="rounded border-gray-300"
            />
            Send SMS to customer
          </label>
          {!booking.phone && (
            <p className="mt-1 text-xs text-gray-500">No phone number available for SMS.</p>
          )}

          <button
            onClick={handleReschedule}
            disabled={rescheduling || cancelling || !hasChanges}
            className="mt-4 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rescheduling ? 'Rescheduling…' : 'Save New Date & Time'}
          </button>

          <button
            onClick={handleCancel}
            disabled={rescheduling || cancelling}
            className="mt-2 w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Ban className="h-4 w-4" />
            {cancelling ? 'Cancelling…' : 'Cancel Appointment'}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-3 text-xs font-semibold text-green-700">{success}</p>}
      {warning && <p className="mt-2 text-xs text-amber-800">{warning}</p>}
    </div>
  )
}
