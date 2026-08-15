import {
  BOOKING_TIMEZONE,
  buildAppointmentDateTimes,
  formatAppointmentTime,
  parseAppointmentTime,
} from '@/lib/bookingTimes'

const DEFAULT_SLOT_MINUTES = 30

/** Map dashboard date + time to UTC ISO values stored in slot_start / slot_end (America/Toronto). */
export function appointmentToSlotIso(
  appointmentDate: string,
  appointmentTime: string,
  durationMinutes = DEFAULT_SLOT_MINUTES
): { slot_start: string; slot_end: string } {
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  const targetDate = appointmentDate
  const targetTime = formatAppointmentTime(hours, minutes)

  const [year, month, day] = appointmentDate.split('-').map(Number)
  const dayStart = Date.UTC(year, month - 1, day, 0, 0, 0)
  const dayEnd = Date.UTC(year, month - 1, day + 1, 0, 0, 0)

  for (let ms = dayStart; ms < dayEnd; ms += 15 * 60 * 1000) {
    const candidate = new Date(ms)
    const localDate = candidate.toLocaleDateString('en-CA', { timeZone: BOOKING_TIMEZONE })
    const localTime = candidate.toLocaleTimeString('en-US', {
      timeZone: BOOKING_TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    if (localDate === targetDate && localTime === targetTime) {
      return {
        slot_start: candidate.toISOString(),
        slot_end: new Date(ms + durationMinutes * 60 * 1000).toISOString(),
      }
    }
  }

  const { startDateTimeLocal, endDateTimeLocal } = buildAppointmentDateTimes(
    appointmentDate,
    appointmentTime
  )
  const fallbackStart = new Date(`${startDateTimeLocal}Z`)
  const fallbackEnd = new Date(`${endDateTimeLocal}Z`)
  return {
    slot_start: fallbackStart.toISOString(),
    slot_end: new Date(fallbackEnd.getTime() + durationMinutes * 60 * 1000).toISOString(),
  }
}
