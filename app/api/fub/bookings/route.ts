import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeAppointmentTime } from '@/lib/bookingTimes'
import {
  FUB_BOOKING_BRANDS,
  FUB_MEETING_TYPES,
  fubPersonName,
  pickFubEmail,
  pickFubPhone,
  resolveFubBookingState,
} from '@/lib/fubEmbeddedApp'

const MEETING_LABEL: Record<string, string> = {
  phone_call: 'Phone Call',
  google_meet: 'Google Meet',
  visit_office: 'Office Visit',
  builder_site_visit: 'Builder Site Visit',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const context = typeof body.context === 'string' ? body.context : ''
    const signature = typeof body.signature === 'string' ? body.signature : ''
    const resolved = resolveFubBookingState(context, signature)

    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized to book from Follow Up Boss.' }, { status: 401 })
    }

    const brand = FUB_BOOKING_BRANDS.find((item) => item.id === body.brand)
    const meeting = FUB_MEETING_TYPES.find((item) => item.id === body.type)
    if (!brand || !meeting) {
      return NextResponse.json({ error: 'Choose a brand and meeting type.' }, { status: 400 })
    }

    const date = String(body.date || '').trim()
    const time = normalizeAppointmentTime(String(body.time || '').trim())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) {
      return NextResponse.json({ error: 'Choose a date and time.' }, { status: 400 })
    }

    const person = resolved.context.person
    const firstname = String(person.firstName || '').trim() || 'Lead'
    const lastname = String(person.lastName || '').trim()
    const email = String(body.email || pickFubEmail(person)).trim()
    const phone = String(body.phone || pickFubPhone(person)).replace(/\D/g, '')
    const project = String(body.project || '').trim() || 'Follow Up Boss'
    const personId = person.id != null ? String(person.id) : ''

    if (!email) {
      return NextResponse.json({ error: 'This lead needs an email to send the calendar invite.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const row = {
      firstname,
      lastname,
      email,
      phone,
      appointment_date: date,
      appointment_time: time,
      appointment_type: meeting.id,
      project_name: project,
      ...(typeof body.projectId === 'string' && body.projectId.trim()
        ? { project_id: String(body.projectId).trim() }
        : {}),
      status: 'confirmed',
      message: personId
        ? `Booked from Follow Up Boss (person ${personId})`
        : 'Booked from Follow Up Boss',
    }

    const { data, error } = await supabase.from(brand.table).insert(row).select('id').single()
    if (error) {
      console.error('FUB booking insert failed:', error.message)
      return NextResponse.json({ error: 'Could not save the booking.' }, { status: 500 })
    }

    const label = MEETING_LABEL[meeting.id] || meeting.label
    const who = fubPersonName(person) || firstname
    return NextResponse.json({
      id: data?.id,
      message: `${label} booked for ${who} on ${date} at ${time}. It will show on the calendar and send the usual invites.`,
    })
  } catch (error) {
    console.error('FUB booking error:', error)
    return NextResponse.json({ error: 'Could not book this meeting.' }, { status: 500 })
  }
}
