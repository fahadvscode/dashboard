import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import nodemailer from 'nodemailer'
import { createEscalationCalendarEvent, normalizeAppointmentTime, SALES_CALENDAR_EMAIL } from '@/lib/bookingCalendar'
import {
  buildEscalationAdminEmailHtml,
  buildEscalationAdminSms,
  parseEscalationStaff,
} from '@/lib/escalations'
import {
  fubPersonName,
  pickFubEmail,
  pickFubPhone,
  resolveFubBookingState,
} from '@/lib/fubEmbeddedApp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const notificationPhones = ['6478981739', '4168296121', '4163994289']
const notificationEmails = ['fahad@fahadsold.com', 'info@preconfactory.com', SALES_CALENDAR_EMAIL]

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

async function notifyStaff(input: {
  staff: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}) {
  const smsBody = buildEscalationAdminSms(input)
  const html = buildEscalationAdminEmailHtml(input)
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER

  if (accountSid && authToken && twilioPhone) {
    const client = twilio(accountSid, authToken)
    await Promise.allSettled(
      notificationPhones.map((raw) =>
        client.messages.create({
          body: smsBody,
          from: twilioPhone,
          to: toE164NorthAmerica(raw),
        })
      )
    )
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'info@qikfill.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })

  await Promise.allSettled(
    notificationEmails.map((to) =>
      transporter.sendMail({
        from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
        to,
        subject: `📞 ${input.staff} has to call: ${input.leadName}`,
        html,
      })
    )
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const resolved = resolveFubBookingState(
      typeof body.context === 'string' ? body.context : '',
      typeof body.signature === 'string' ? body.signature : ''
    )
    if (resolved.status !== 'working' || !resolved.context?.person) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
    }

    const staff = parseEscalationStaff(body.staff)
    if (!staff) {
      return NextResponse.json({ error: 'Choose who to escalate to.' }, { status: 400 })
    }

    const date = String(body.date || '').trim()
    const time = normalizeAppointmentTime(String(body.time || '').trim())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) {
      return NextResponse.json({ error: 'Choose a date and time.' }, { status: 400 })
    }

    const person = resolved.context.person
    const leadName = fubPersonName(person) || 'Lead'
    const email = pickFubEmail(person)
    const phone = pickFubPhone(person)
    const personId = person.id != null ? String(person.id) : ''

    const event = await createEscalationCalendarEvent({
      leadName,
      staff,
      date,
      time,
      email,
      phone,
      personId,
    })

    try {
      await notifyStaff({ staff, leadName, email, phone, date, time })
    } catch (notifyError) {
      console.error('FUB escalation staff notify failed:', notifyError)
    }

    return NextResponse.json({
      eventId: event?.id,
      message: `${staff} has to call ${leadName} on ${date} at ${time}. On the staff calendars and notifications — the lead was not contacted.`,
    })
  } catch (error) {
    console.error('FUB escalation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create the escalation.' },
      { status: 500 }
    )
  }
}
