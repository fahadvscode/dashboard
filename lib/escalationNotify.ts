import twilio from 'twilio'
import nodemailer from 'nodemailer'
import { ESCALATION_CALENDAR_ATTENDEE } from '@/lib/escalations'
import { SALES_CALENDAR_EMAIL } from '@/lib/bookingCalendar'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  buildEscalationAdminEmailHtml,
  buildEscalationAdminSms,
} from '@/lib/escalations'

export const ESCALATION_SMS_TO = ['6478981739', '4168296121', '4163994289'] as const

const notificationEmails = [ESCALATION_CALENDAR_ATTENDEE, 'fahad@fahadsold.com', 'info@preconfactory.com', SALES_CALENDAR_EMAIL]

type EscalationNotice = {
  staff: string
  from: string
  leadName: string
  email: string
  phone: string
  date: string
  time: string
}

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

function smsClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
  if (!accountSid || !authToken || !twilioPhone) return null
  return { client: twilio(accountSid, authToken), from: twilioPhone }
}

export async function sendEscalationSms(input: EscalationNotice, body: string) {
  const sms = smsClient()
  if (!sms) return
  await Promise.allSettled(
    ESCALATION_SMS_TO.map((raw) =>
      sms.client.messages.create({
        body,
        from: sms.from,
        to: toE164NorthAmerica(raw),
      })
    )
  )
}

export async function notifyEscalationCreated(input: EscalationNotice) {
  await sendEscalationSms(input, buildEscalationAdminSms(input))

  const html = buildEscalationAdminEmailHtml(input)
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

export async function saveEscalationReminder(input: EscalationNotice & { dueAt: Date; personId?: string }) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('fub_escalations').insert({
    due_at: input.dueAt.toISOString(),
    staff: input.staff,
    escalated_from: input.from,
    lead_name: input.leadName,
    email: input.email,
    phone: input.phone,
    person_id: input.personId || null,
    date_label: input.date,
    time_label: input.time,
  })
  if (error) throw error
}

export async function sendDueEscalationReminders() {
  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const windowStart = new Date(now - 60 * 1000).toISOString()
  const windowEnd = new Date(now + 3 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('fub_escalations')
    .select('*')
    .eq('reminder_sms_sent', false)
    .gte('due_at', windowStart)
    .lte('due_at', windowEnd)

  if (error) throw error
  const rows = data || []
  let sent = 0

  for (const row of rows) {
    const claimed = await supabase
      .from('fub_escalations')
      .update({ reminder_sms_sent: true, reminder_sms_sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('reminder_sms_sent', false)
      .select('id')

    if (claimed.error || !claimed.data?.length) continue

    const notice: EscalationNotice = {
      staff: String(row.staff || ''),
      from: String(row.escalated_from || ''),
      leadName: String(row.lead_name || 'Lead'),
      email: String(row.email || ''),
      phone: String(row.phone || ''),
      date: String(row.date_label || ''),
      time: String(row.time_label || ''),
    }
    const body = `⏰ Escalation in 2 minutes\n\n${buildEscalationAdminSms(notice)}`
    await sendEscalationSms(notice, body)
    sent += 1
  }

  return { checked: rows.length, sent }
}
