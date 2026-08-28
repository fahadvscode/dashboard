import { createHmac, timingSafeEqual } from 'crypto'

export const FUB_BOOKING_BRANDS = [
  { id: 'fj', label: 'Fahad Javed', table: 'fj_bookings' },
  { id: 'precon', label: 'Precon Factory', table: 'precon_factory_bookings' },
  { id: 'gta', label: 'GTA Lowrise', table: 'gta_lowrise_bookings' },
] as const

export const FUB_MEETING_TYPES = [
  { id: 'phone_call', label: 'Phone Call' },
  { id: 'google_meet', label: 'Google Meet' },
  { id: 'visit_office', label: 'Office Visit' },
  { id: 'builder_site_visit', label: 'Builder Site Visit' },
] as const

export type FubDebugState =
  | 'working'
  | 'account_not_found'
  | 'user_not_found'
  | 'person_not_found'
  | 'unauthorized'

export type FubPerson = {
  id?: number | string
  firstName?: string
  lastName?: string
  emails?: Array<{ value?: string; isPrimary?: number | boolean }>
  phones?: Array<{ value?: string; normalized?: string; isPrimary?: number | boolean }>
}

export type FubContext = {
  example?: boolean
  debugState?: FubDebugState | string
  context?: string
  account?: { id?: number; domain?: string }
  person?: FubPerson
  user?: { id?: number; name?: string; email?: string }
}

export function getFubEmbeddedAppSecret() {
  return process.env.FUB_EMBEDDED_APP_SECRET?.trim() || ''
}

export function verifyFubSignature(context: string, signature: string, secret = getFubEmbeddedAppSecret()) {
  if (!context || !signature || !secret) return false
  const calculated = createHmac('sha256', secret).update(context).digest('hex')
  const expected = calculated.toLowerCase()
  const received = signature.trim().toLowerCase()
  if (expected.length !== received.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'))
  } catch {
    return false
  }
}

export function decodeFubContext(context: string): FubContext | null {
  try {
    const json = Buffer.from(context, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as FubContext
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    try {
      const json = Buffer.from(context.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      const parsed = JSON.parse(json) as FubContext
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }
}

function isPrimary(flag: number | boolean | undefined) {
  return flag === 1 || flag === true
}

export function pickFubEmail(person?: FubPerson | null) {
  const emails = person?.emails || []
  const primary = emails.find((item) => isPrimary(item.isPrimary) && item.value)
  return String(primary?.value || emails[0]?.value || '').trim()
}

export function pickFubPhone(person?: FubPerson | null) {
  const phones = person?.phones || []
  const primary = phones.find((item) => isPrimary(item.isPrimary) && (item.normalized || item.value))
  const chosen = primary || phones[0]
  return String(chosen?.normalized || chosen?.value || '').replace(/\D/g, '')
}

export function fubPersonName(person?: FubPerson | null) {
  return `${person?.firstName || ''} ${person?.lastName || ''}`.trim()
}

export function resolveFubBookingState(contextParam: string | null, signatureParam: string | null) {
  const secret = getFubEmbeddedAppSecret()
  if (!secret) {
    return { status: 'missing_secret' as const, context: null as FubContext | null }
  }

  const contextRaw = contextParam?.trim() || ''
  const signatureRaw = signatureParam?.trim() || ''
  if (!contextRaw) {
    return { status: 'no_context' as const, context: null as FubContext | null }
  }

  if (!verifyFubSignature(contextRaw, signatureRaw, secret)) {
    return { status: 'unauthorized' as const, context: null as FubContext | null }
  }

  const decoded = decodeFubContext(contextRaw)
  if (!decoded) {
    return { status: 'unauthorized' as const, context: null as FubContext | null }
  }

  const debugState = String(decoded.debugState || '').trim() as FubDebugState | ''
  if (debugState === 'unauthorized') return { status: 'unauthorized' as const, context: decoded }
  if (debugState === 'account_not_found') return { status: 'account_not_found' as const, context: decoded }
  if (debugState === 'user_not_found') return { status: 'user_not_found' as const, context: decoded }
  if (debugState === 'person_not_found') return { status: 'person_not_found' as const, context: decoded }

  if (!decoded.person?.id && !fubPersonName(decoded.person)) {
    return { status: 'person_not_found' as const, context: decoded }
  }

  return { status: 'working' as const, context: decoded }
}
