export const FOLLOW_UP_SLOTS = ['12 PM', '4 PM', '7 PM'] as const
export type FollowUpSlot = (typeof FOLLOW_UP_SLOTS)[number]

export const FOLLOW_UP_STAFF = ['Nisha', 'Aman', 'Harjit', 'Jay', 'Fahad', 'Gigi'] as const
export type FollowUpStaff = (typeof FOLLOW_UP_STAFF)[number]

const SLOT_HOURS: Record<FollowUpSlot, number> = {
  '12 PM': 12,
  '4 PM': 16,
  '7 PM': 19,
}

export function isFollowUpSlot(value: unknown): value is FollowUpSlot {
  return FOLLOW_UP_SLOTS.includes(String(value || '') as FollowUpSlot)
}

export function parseFollowUpStaff(value: unknown): FollowUpStaff | '' {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return FOLLOW_UP_STAFF.find((name) => name.toLowerCase() === raw.toLowerCase()) || ''
}

export function buildFollowUpTaskName(staff: string, slot: FollowUpSlot, note: string) {
  const name = staff.trim()
  const extra = note.trim()
  if (!name) return extra ? `Follow-up - ${extra}` : 'Follow-up'
  if (extra) return `${name} - ${extra}`
  return `${name} - ${slot}`
}

export function buildFollowUpNoteBody(staff: string, slot: FollowUpSlot, note: string) {
  const name = staff.trim() || 'Follow-up'
  const first = `${name} - ${slot}`
  const extra = note.trim()
  return extra ? `${first}\n${extra}` : first
}

export function followUpDueDateTime(dateYmd: string, slot: FollowUpSlot, midnightIso: string) {
  const startMs = new Date(midnightIso).getTime()
  return new Date(startMs + SLOT_HOURS[slot] * 60 * 60 * 1000).toISOString()
}
