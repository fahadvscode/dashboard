export const FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE = 'fahad_sells_interview_bookings'

export const INTERVIEW_OFFICE_ADDRESS =
  '600 Matheson Blvd W Unit 5, Mississauga, ON L5R 4B8'

export const INTERVIEW_BRAND_NAME = 'Fahad Javed Real Estate'

export function isFahadSellsInterviewBooking(tableName: unknown): boolean {
  return tableName === FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE
}

/** Must match fix_fahad_sells_interview_bookings_status_constraint.sql */
export const INTERVIEW_BOOKING_STATUS_SCHEDULED = 'scheduled'
export const INTERVIEW_BOOKING_STATUS_CANCELED = 'canceled'
