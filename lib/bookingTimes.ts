export const BOOKING_TIMEZONE = 'America/Toronto'
export const OFFICE_ADDRESS = '600 Matheson Blvd W, Mississauga, ON L5R 4C1'

export const VALID_BOOKING_TABLES = [
  'fj_bookings',
  'precon_factory_bookings',
  'gta_lowrise_bookings',
] as const

export type BookingTable = (typeof VALID_BOOKING_TABLES)[number]

export function isValidBookingTable(table: string): table is BookingTable {
  return (VALID_BOOKING_TABLES as readonly string[]).includes(table)
}

export function getBrandFromTable(tableName: string): string {
  if (tableName.includes('gta_lowrise') || tableName.includes('gtalowrise')) {
    return 'GTA Lowrise'
  }
  if (tableName.includes('precon')) {
    return 'Precon Factory'
  }
  return 'Fahad Javed Real Estate'
}

export function getBrandContact(source: string) {
  if (source === 'Fahad Javed Real Estate') {
    return { email: 'fahad@fahadsold.com', phoneFormatted: '(647) 898-1739' }
  }
  if (source === 'Precon Factory') {
    return { email: 'info@preconfactory.com', phoneFormatted: '(647) 956-4063' }
  }
  return { email: 'gtalowrise01@gmail.com', phoneFormatted: '(416) 399-4289' }
}

export function parseAppointmentTime(appointmentTime: string): { hours: number; minutes: number } {
  let hours = 0
  let minutes = 0
  const timeMatch = appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)?/i)
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10)
    minutes = parseInt(timeMatch[2], 10)
    const period = timeMatch[3]?.toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
  }
  return { hours, minutes }
}

export function formatAppointmentTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

export function buildAppointmentDateTimes(appointmentDate: string, appointmentTime: string) {
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  const startDateTimeLocal = `${appointmentDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

  const endMinutes = minutes + 30
  const adjustedEndHours = endMinutes >= 60 ? hours + 1 : hours
  const adjustedEndMinutes = endMinutes >= 60 ? endMinutes - 60 : endMinutes
  const endDateTimeLocal = `${appointmentDate}T${String(adjustedEndHours).padStart(2, '0')}:${String(adjustedEndMinutes).padStart(2, '0')}:00`

  return { startDateTimeLocal, endDateTimeLocal }
}

export function generateAppointmentTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 8; hour <= 19; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 19 && minute === 30) continue
      slots.push(formatAppointmentTime(hour, minute))
    }
  }
  return slots
}

export const APPOINTMENT_TIME_SLOTS = generateAppointmentTimeSlots()

export function normalizeAppointmentTime(appointmentTime: string): string {
  const { hours, minutes } = parseAppointmentTime(appointmentTime)
  if (hours === 0 && minutes === 0 && !appointmentTime.match(/\d/)) {
    return APPOINTMENT_TIME_SLOTS[0]
  }
  const formatted = formatAppointmentTime(hours, minutes)
  if (APPOINTMENT_TIME_SLOTS.includes(formatted)) {
    return formatted
  }
  return formatted
}

export function getReminderResetFields() {
  return {
    reminder_24h_sent: false,
    reminder_24h_sent_at: null,
    reminder_1h_sent: false,
    reminder_1h_sent_at: null,
    reminder_5m_sent: false,
    reminder_5m_sent_at: null,
    reminder_admin_1h_sent: false,
    reminder_admin_1h_sent_at: null,
    reminder_admin_15m_sent: false,
    reminder_admin_15m_sent_at: null,
  }
}
