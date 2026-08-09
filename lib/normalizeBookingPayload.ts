/** Map Supabase booking rows (incl. fahad_sells_interview_bookings) to notify/calendar field names. */
export function normalizeBookingPayload(booking: Record<string, unknown>): void {
  const existingFirst =
    (typeof booking.firstname === 'string' && booking.firstname.trim()) ||
    (typeof booking.first_name === 'string' && booking.first_name.trim()) ||
    ''

  if (!existingFirst && typeof booking.full_name === 'string' && booking.full_name.trim()) {
    const parts = booking.full_name.trim().split(/\s+/)
    booking.firstname = parts[0] || ''
    booking.lastname = parts.slice(1).join(' ') || ''
  }

  const hasAppointmentDate =
    typeof booking.appointment_date === 'string' && booking.appointment_date.trim() !== ''
  const slotStart = booking.slot_start
  if (!hasAppointmentDate && slotStart !== undefined && slotStart !== null && String(slotStart).trim() !== '') {
    const start = new Date(String(slotStart))
    if (!Number.isNaN(start.getTime())) {
      booking.appointment_date = start.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
      booking.appointment_time = start.toLocaleTimeString('en-US', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  }

  const slotEnd = booking.slot_end
  if (slotEnd !== undefined && slotEnd !== null && String(slotEnd).trim() !== '') {
    const end = new Date(String(slotEnd))
    if (!Number.isNaN(end.getTime()) && !booking.appointment_end_time) {
      booking.appointment_end_time = end.toLocaleTimeString('en-US', {
        timeZone: 'America/Toronto',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    }
  }
}

export function resolveBookingFirstName(booking: Record<string, unknown>): string {
  return (
    (typeof booking.firstname === 'string' ? booking.firstname.trim() : '') ||
    (typeof booking.first_name === 'string' ? booking.first_name.trim() : '') ||
    (typeof booking.full_name === 'string' ? booking.full_name.trim().split(/\s+/)[0] : '') ||
    ''
  )
}

export function resolveBookingLastName(booking: Record<string, unknown>): string {
  const fromFields =
    (typeof booking.lastname === 'string' ? booking.lastname.trim() : '') ||
    (typeof booking.last_name === 'string' ? booking.last_name.trim() : '')
  if (fromFields) return fromFields
  if (typeof booking.full_name === 'string' && booking.full_name.trim()) {
    const parts = booking.full_name.trim().split(/\s+/)
    return parts.slice(1).join(' ')
  }
  return ''
}
