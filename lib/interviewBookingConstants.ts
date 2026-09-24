export const FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE = 'fahad_sells_interview_bookings'

export const INTERVIEW_OFFICE_ADDRESS =
  '600 Matheson Blvd W Unit 5, Mississauga, ON L5R 4B8'

export const INTERVIEW_BRAND_NAME = 'Fahad Javed Real Estate'

export function isFahadSellsInterviewBooking(tableName: unknown): boolean {
  return tableName === FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE
}

/** ISA or Real Estate Agent, from the careers position fields. Empty when unknown. */
export function interviewRoleLabel(source: {
  position_label?: unknown
  position_id?: unknown
} | null | undefined): string {
  const label = String(source?.position_label || '').trim()
  const id = String(source?.position_id || '').replace(/[_-]+/g, ' ').trim().toLowerCase()
  const haystack = `${label} ${id}`.toLowerCase()
  if (/\bisa\b|inside sales/.test(haystack)) return 'ISA'
  if (/real estate|\brealtor\b|\bagent\b/.test(haystack)) return 'Real Estate Agent'
  return label
}

/** Heading used in calendar titles, SMS, and email. */
export function interviewHeading(source: {
  position_label?: unknown
  position_id?: unknown
} | null | undefined): string {
  const role = interviewRoleLabel(source)
  return role ? `${role} Interview` : 'Interview'
}

/** Sentence form, keeping ISA capitalized. */
export function interviewPhrase(source: {
  position_label?: unknown
  position_id?: unknown
} | null | undefined): string {
  const role = interviewRoleLabel(source)
  if (role === 'ISA') return 'ISA interview'
  if (role === 'Real Estate Agent') return 'real estate agent interview'
  return role ? `${role} interview` : 'interview'
}

/** Must match fahadsells careers DB — only scheduled | cancelled (British spelling). */
export const INTERVIEW_BOOKING_STATUS_SCHEDULED = 'scheduled'
export const INTERVIEW_BOOKING_STATUS_CANCELLED = 'cancelled'
