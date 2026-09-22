export const BOOKED_BY_OPTIONS = ['Nisha', 'Aman', 'Harjit', 'Jay', 'Fahad', 'Gigi'] as const

export type BookedByName = (typeof BOOKED_BY_OPTIONS)[number]

export function parseBookedBy(value: unknown): BookedByName | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return BOOKED_BY_OPTIONS.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

/** Puts the staff name at the front of a calendar event title. */
export function bookedByCalendarPrefix(value: unknown): string {
  const name = parseBookedBy(value)
  return name ? `${name} - ` : ''
}

export function bookedByAdminSmsLine(value: unknown): string {
  const name = parseBookedBy(value)
  return name ? `\n🧑‍💼 Booked by: ${name}` : ''
}

export function bookedByAdminEmailRow(value: unknown): string {
  const name = parseBookedBy(value)
  if (!name) return ''
  return `<div class="detail-row"><div class="detail-label">🧑‍💼 Booked by:</div><div class="detail-value">${name}</div></div>`
}
