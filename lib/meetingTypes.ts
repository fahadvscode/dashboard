import { OFFICE_ADDRESS } from '@/lib/bookingTimes'

export const MEETING_TYPES = [
  { id: 'phone_call', label: 'Phone Call' },
  { id: 'google_meet', label: 'Google Meet' },
  { id: 'visit_office', label: 'Office Visit' },
  { id: 'builder_site_visit', label: 'Site Visit' },
] as const

export type MeetingTypeId = (typeof MEETING_TYPES)[number]['id']

export function isMeetingTypeId(value: string): value is MeetingTypeId {
  return MEETING_TYPES.some((item) => item.id === value)
}

export function parseMeetingType(value: unknown): MeetingTypeId | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const normalized = value.toLowerCase().replace(/[_-]+/g, ' ').trim()
  if (normalized.includes('google meet') || normalized.includes('zoom')) return 'google_meet'
  if (normalized.includes('site visit') || normalized.includes('builder visit')) return 'builder_site_visit'
  if (normalized.includes('office')) return 'visit_office'
  if (normalized.includes('phone')) return 'phone_call'
  const id = value.trim()
  return isMeetingTypeId(id) ? id : null
}

export function meetingTypeLabel(value: unknown) {
  const id = parseMeetingType(value)
  return MEETING_TYPES.find((item) => item.id === id)?.label || String(value || 'Appointment')
}

export function meetingCalendarLocation(type: MeetingTypeId, brandPhone: string) {
  switch (type) {
    case 'google_meet':
      return 'Google Meet (auto-generated)'
    case 'visit_office':
      return OFFICE_ADDRESS
    case 'builder_site_visit':
      return 'Builder Site Visit - Location TBD'
    default:
      return `Phone Call - ${brandPhone}`
  }
}
