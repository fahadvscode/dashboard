import { endOfDay, isValid, parse, startOfDay, subDays } from 'date-fns'

export type LeadDatePreset = 'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'

/** Inclusive local-day range for filtering `created_at`. Null = no date filter (all time). */
export function getLeadCreatedAtInterval(
  preset: LeadDatePreset,
  customStart: string,
  customEnd: string
): { start: Date; end: Date } | null {
  const now = new Date()
  switch (preset) {
    case 'all':
      return null
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday': {
      const d = subDays(now, 1)
      return { start: startOfDay(d), end: endOfDay(d) }
    }
    case '7d':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case '30d':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
    case 'custom': {
      if (!customStart?.trim() || !customEnd?.trim()) return null
      const s = parse(customStart.trim(), 'yyyy-MM-dd', now)
      const e = parse(customEnd.trim(), 'yyyy-MM-dd', now)
      if (!isValid(s) || !isValid(e)) return null
      let start = startOfDay(s)
      let end = endOfDay(e)
      if (start.getTime() > end.getTime()) {
        start = startOfDay(e)
        end = endOfDay(s)
      }
      return { start, end }
    }
    default:
      return null
  }
}

export function leadCreatedAtMatchesRange(
  createdAt: string | null | undefined,
  interval: { start: Date; end: Date } | null
): boolean {
  if (!interval) return true
  const t = createdAt ? new Date(createdAt).getTime() : NaN
  if (Number.isNaN(t)) return false
  return t >= interval.start.getTime() && t <= interval.end.getTime()
}
