/**
 * Re-send interview confirmation email/SMS without creating another calendar event.
 *
 *   npx tsx scripts/resend-interview-notify.ts
 *   BOOKING_ID=... npx tsx scripts/resend-interview-notify.ts
 */
import { resolve } from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import twilio from 'twilio'
import { normalizeBookingPayload, resolveBookingFirstName } from '../lib/normalizeBookingPayload'
import {
  INTERVIEW_BRAND_NAME,
  INTERVIEW_OFFICE_ADDRESS,
} from '../lib/interviewBookingConstants'
import {
  getInterviewManageLinkHtml,
  getInterviewManageLinkSms,
  resolveInterviewManageUrl,
} from '../lib/interviewManageUrl'

config({ path: resolve(process.cwd(), '.env.local') })

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const bookingId = process.env.BOOKING_ID
  let query = supabase.from('fahad_sells_interview_bookings').select('*')
  const { data, error } = bookingId
    ? await query.eq('id', bookingId).limit(1)
    : await query.order('created_at', { ascending: false }).limit(1)
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('No interview booking found')

  const booking = { ...row, table_name: 'fahad_sells_interview_bookings' } as Record<string, unknown>
  normalizeBookingPayload(booking)
  const firstname = resolveBookingFirstName(booking)
  const manageUrl = resolveInterviewManageUrl(booking)

  console.log('Booking', row.id, booking.email, booking.phone, booking.appointment_date, booking.appointment_time)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'info@qikfill.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  const candidateHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
    <div style="max-width:600px;margin:0 auto;padding:20px;">
      <p>Hi <strong>${firstname}</strong>,</p>
      <p>Your interview has been scheduled. Here are the details:</p>
      <p><strong>Date:</strong> ${booking.appointment_date}<br>
      <strong>Time:</strong> ${booking.appointment_time}<br>
      <strong>Location:</strong> ${INTERVIEW_OFFICE_ADDRESS}</p>
      ${getInterviewManageLinkHtml(manageUrl)}
      <p>Best regards,<br>${INTERVIEW_BRAND_NAME}</p>
    </div>
  </body></html>`

  const candidateEmail = await transporter.sendMail({
    from: `"${INTERVIEW_BRAND_NAME}" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
    to: String(booking.email),
    subject: `Interview confirmed — ${booking.appointment_date} at ${booking.appointment_time}`,
    html: candidateHtml,
  })
  console.log('Candidate email:', candidateEmail.messageId)

  for (const admin of ['fahad@fahadsold.com', 'info@preconfactory.com']) {
    const adminEmail = await transporter.sendMail({
      from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
      to: admin,
      subject: `🔔 New ${INTERVIEW_BRAND_NAME} Interview Booking - ${firstname}`,
      html: `<p>Interview booked for <strong>${firstname}</strong></p>
        <p>Email: ${booking.email}<br>Phone: ${booking.phone}<br>
        Date: ${booking.appointment_date} at ${booking.appointment_time}</p>
        <p><a href="https://property-dashboard-three.vercel.app/interview-bookings">View in Dashboard</a></p>`,
    })
    console.log('Admin email', admin, adminEmail.messageId)
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER
  if (booking.phone && accountSid && authToken && twilioPhone) {
    const client = twilio(accountSid, authToken)
    const sms = await client.messages.create({
      from: twilioPhone,
      to: toE164NorthAmerica(String(booking.phone)),
      body: `Interview confirmed — ${INTERVIEW_BRAND_NAME}

📅 ${booking.appointment_date}
🕐 ${booking.appointment_time}
🏢 Please arrive for your interview at:
${INTERVIEW_OFFICE_ADDRESS}${getInterviewManageLinkSms(manageUrl)}

- ${INTERVIEW_BRAND_NAME}`,
    })
    console.log('Candidate SMS:', sms.sid, sms.status)
  } else {
    console.log('SMS skipped — missing phone or Twilio env')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
