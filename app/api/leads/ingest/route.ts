import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const TABLE_NAME = 'agency_landing_leads'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Lead-Webhook-Secret',
  'Access-Control-Max-Age': '86400',
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}

function secretsMatch(provided: string, expected: string) {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function asString(value: unknown, max = 200) {
  if (value === undefined || value === null) return ''
  return String(value).trim().slice(0, max)
}

function parseBroker(value: unknown) {
  if (value === true || value === 1) return true
  const raw = String(value ?? '').trim().toLowerCase()
  return ['yes', 'true', '1', 'y', 'realtor', 'broker'].includes(raw)
}

function normalizeUrl(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, '')
  if (raw.includes('.')) return `https://${raw.replace(/^\/\//, '').replace(/\/$/, '')}`
  return raw
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AGENCY_LEAD_WEBHOOK_SECRET || ''
  if (!expectedSecret) {
    return json({ ok: false, error: 'Lead webhook is not configured.' }, 503)
  }

  const providedSecret = request.headers.get('x-lead-webhook-secret') || ''
  if (!secretsMatch(providedSecret, expectedSecret)) {
    return json({ ok: false, error: 'Invalid webhook secret.' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'Request body must be JSON.' }, 400)
  }

  // Honeypot — bots that fill hidden fields are dropped silently
  if (asString(body.fax, 80) || asString(body.hp_website, 80)) {
    return json({ ok: true })
  }

  const fromFullName = splitFullName(asString(body.full_name, 120))
  const first_name = asString(body.first_name ?? body.firstname, 80) || fromFullName.first_name
  const last_name = asString(body.last_name ?? body.lastname, 80) || fromFullName.last_name
  const email = asString(body.email, 200).toLowerCase()
  const phone = asString(body.phone, 40)
  const is_broker = parseBroker(body.is_broker ?? body.broker ?? body.is_realtor)
  const source = normalizeUrl(asString(body.source, 500))
  const project_name = asString(body.project_name ?? body.project, 160)
  const page_path = asString(body.page_path, 300) || '/'
  const notes = asString(body.notes ?? body.message, 2000)
  const utm_source = asString(body.utm_source, 120)
  const utm_campaign = asString(body.utm_campaign, 160)

  if (!first_name || !email || !phone || !source || !project_name) {
    return json(
      {
        ok: false,
        error:
          'Missing required fields. Send first_name, last_name, email, phone, is_broker, source, and project_name.',
      },
      400
    )
  }

  if (!isValidEmail(email)) {
    return json({ ok: false, error: 'Please enter a valid email address.' }, 400)
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        first_name,
        last_name,
        email,
        phone,
        is_broker,
        source,
        project_name,
        page_path,
        notes: notes || null,
        utm_source: utm_source || null,
        utm_campaign: utm_campaign || null,
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Agency lead ingest insert failed:', error)
      return json({ ok: false, error: 'Could not save this lead. Please try again.' }, 500)
    }

    return json({ ok: true, id: data?.id })
  } catch (error) {
    console.error('Agency lead ingest failed:', error)
    return json({ ok: false, error: 'Could not save this lead. Please try again.' }, 500)
  }
}
