export const FOLLOW_UP_SLOTS = ['12 PM', '4 PM', '7 PM'] as const
export type FollowUpSlot = (typeof FOLLOW_UP_SLOTS)[number]

export const FOLLOW_UP_STAFF = ['Nisha', 'Aman', 'Harjit', 'Jay', 'Fahad', 'Gigi'] as const
export type FollowUpStaff = (typeof FOLLOW_UP_STAFF)[number]

/** Follow Up Boss users the task can be assigned to. Names must match FUB exactly. */
export const FOLLOW_UP_ASSIGNEES = ['Fahad Javed', 'Fahad Javed office'] as const
export type FollowUpAssignee = (typeof FOLLOW_UP_ASSIGNEES)[number]

export type FollowUpFubUser = {
  id: number
  name: string
}

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

export function parseFollowUpAssignee(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const known = FOLLOW_UP_ASSIGNEES.find((name) => name.toLowerCase() === raw.toLowerCase())
  return known || raw
}

export function parseFollowUpAssigneeUserId(value: unknown): number | null {
  const id = typeof value === 'number' ? value : Number(String(value || '').trim())
  return Number.isFinite(id) && id > 0 ? id : null
}

/** Exact name match only — "Fahad Javed" must not match "Fahad Javed office". */
export function matchFubAssignee(
  users: FollowUpFubUser[],
  selected: { id?: number | null; name?: string }
): FollowUpFubUser | null {
  const selectedId = parseFollowUpAssigneeUserId(selected.id)
  if (selectedId) {
    const byId = users.find((user) => user.id === selectedId)
    if (byId) return byId
  }
  const needle = parseFollowUpAssignee(selected.name)
  if (!needle) return null
  const exact = users.filter((user) => user.name.trim().toLowerCase() === needle.toLowerCase())
  return exact[0] || null
}

export function defaultFollowUpAssignee(
  users: FollowUpFubUser[],
  currentUser?: { id?: number | null; name?: string }
): FollowUpFubUser | null {
  const current = matchFubAssignee(users, { id: currentUser?.id, name: currentUser?.name })
  if (current) return current
  const preferred = matchFubAssignee(users, { name: FOLLOW_UP_ASSIGNEES[0] })
  return preferred || users[0] || null
}

export function orderFollowUpAssignees(users: FollowUpFubUser[]): FollowUpFubUser[] {
  const preferred: FollowUpFubUser[] = []
  const rest: FollowUpFubUser[] = []
  for (const user of users) {
    const known = FOLLOW_UP_ASSIGNEES.some((name) => name.toLowerCase() === user.name.trim().toLowerCase())
    if (known) preferred.push(user)
    else rest.push(user)
  }
  preferred.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))
  rest.sort((a, b) => a.name.localeCompare(b.name))
  return [...preferred, ...rest]
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
