import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import nodemailer from 'nodemailer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER
const notificationPhones = ['6478981739', '4168296121', '4163994289']
const notificationEmails = ['info@fahadsold.com', 'info@preconfactory.com']

const OFFICE_ADDRESS = '600 Matheson Blvd W, Mississauga, ON L5R 4C1'

function getMeetingFormat(booking: Booking): string {
  return (booking.meeting_format || booking.appointment_type || '').trim().toLowerCase()
}

function typeLabel(t: string): string {
  switch (t) {
    case 'google_meet': return 'Google Meet'
    case 'visit_office': return 'Office Visit'
    case 'builder_site_visit': return 'Builder Site Visit'
    default: return 'Phone Call'
  }
}

/** Twilio expects E.164 (e.g. +16478981739). */
function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

const twilioClient = twilio(accountSid, authToken)

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

interface Booking {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  meeting_format?: string
  project_name?: string
  project_url?: string
  message?: string
  status: string
  created_at: string
  reminder_24h_sent: boolean
  reminder_1h_sent: boolean
  reminder_5m_sent: boolean
  reminder_admin_1h_sent: boolean
  reminder_admin_15m_sent: boolean
  meet_link?: string
  table_name?: string
}

// Helper to parse appointment datetime
function getAppointmentDateTime(booking: Booking): Date {
  const dateStr = booking.appointment_date // YYYY-MM-DD
  const timeStr = booking.appointment_time // "10:00 AM" or "14:30"
  
  let hours = 0
  let minutes = 0
  const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i)
  if (timeMatch) {
    hours = parseInt(timeMatch[1])
    minutes = parseInt(timeMatch[2])
    const period = timeMatch[3]?.toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
  }
  
  const appointmentDate = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`) // Toronto timezone
  return appointmentDate
}

// Helper to get brand name
function getBrandName(tableName: string): string {
  if (tableName.includes('gta_lowrise')) return 'GTA Lowrise'
  if (tableName.includes('precon')) return 'Precon Factory'
  return 'FJ'
}

function getBrandContact(source: string) {
  if (source === 'FJ') {
    return { email: 'info@fahadsold.com', phoneFormatted: '(647) 898-1739' }
  } else if (source === 'Precon Factory') {
    return { email: 'info@preconfactory.com', phoneFormatted: '(647) 956-4063' }
  }
  return { email: 'gtalowrise01@gmail.com', phoneFormatted: '(416) 399-4289' }
}

// Helper to format time for display
function formatTime(timeStr: string): string {
  return timeStr
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    // Allow when: no CRON_SECRET set, OR Bearer token matches, OR x-vercel-cron header present
    const authHeader = request.headers.get('authorization')
    const vercelCronHeader = request.headers.get('x-vercel-cron')
    const cronSecret = process.env.CRON_SECRET
    
    const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || vercelCronHeader === '1'
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔔 Starting booking reminder check...')

    const tables = ['fj_bookings', 'precon_factory_bookings', 'gta_lowrise_bookings']
    const now = new Date()
    const results = {
      checked: 0,
      sent: 0,
      errors: 0,
      details: [] as Array<{ type: string; booking: string }>
    }

    for (const tableName of tables) {
      // Get upcoming bookings (include pending/confirmed/new/null; exclude cancelled/completed)
      const { data: bookings, error } = await supabase
        .from(tableName)
        .select('*')
        .gte('appointment_date', now.toISOString().split('T')[0]) // Today or future
        .or('status.in.(pending,confirmed,new),status.is.null')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) {
        console.error(`Error fetching bookings from ${tableName}:`, error)
        results.errors++
        continue
      }

      if (!bookings || bookings.length === 0) continue

      results.checked += bookings.length

      for (const booking of bookings) {
        const bookingWithTable = { ...booking, table_name: tableName }
        try {
          const appointmentTime = getAppointmentDateTime(bookingWithTable)
          const hoursUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
          const minutesUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60)
          const brandName = getBrandName(tableName)

          // Skip if appointment is in the past
          if (hoursUntil < 0) continue

          // 24-HOUR CUSTOMER REMINDER (SMS + email)
          if (!booking.reminder_24h_sent && hoursUntil <= 24 && hoursUntil > 1) {
            await send24HourCustomerReminder(bookingWithTable, brandName)
            await markReminderSent(tableName, booking.id, 'reminder_24h_sent')
            results.sent++
            results.details.push({ type: '24h customer', booking: booking.id })
          }

          // 1-HOUR CUSTOMER REMINDER (SMS + email)
          if (!booking.reminder_1h_sent && hoursUntil <= 1 && minutesUntil > 5) {
            await send1HourCustomerReminder(bookingWithTable, brandName)
            await markReminderSent(tableName, booking.id, 'reminder_1h_sent')
            results.sent++
            results.details.push({ type: '1h customer', booking: booking.id })
          }

          // 5-MIN CUSTOMER REMINDER (SMS only - too late for email)
          if (booking.phone && !booking.reminder_5m_sent && minutesUntil <= 5 && minutesUntil > 0) {
            await send5MinCustomerReminder(bookingWithTable, brandName)
            await markReminderSent(tableName, booking.id, 'reminder_5m_sent')
            results.sent++
            results.details.push({ type: '5min customer SMS', booking: booking.id })
          }

          // 1-HOUR ADMIN REMINDER (SMS + email)
          if (!booking.reminder_admin_1h_sent && hoursUntil <= 1 && minutesUntil > 15) {
            await send1HourAdminReminder(bookingWithTable, brandName)
            await markReminderSent(tableName, booking.id, 'reminder_admin_1h_sent')
            results.sent++
            results.details.push({ type: '1h admin SMS+email', booking: booking.id })
          }

          // 15-MIN ADMIN REMINDER (SMS + email)
          if (!booking.reminder_admin_15m_sent && minutesUntil <= 15 && minutesUntil > 0) {
            await send15MinAdminReminder(bookingWithTable, brandName)
            await markReminderSent(tableName, booking.id, 'reminder_admin_15m_sent')
            results.sent++
            results.details.push({ type: '15min admin SMS+email', booking: booking.id })
          }

        } catch (error) {
          console.error(`Error processing booking ${booking.id}:`, error)
          results.errors++
        }
      }
    }

    console.log('✅ Reminder check complete:', results)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in reminder cron:', error)
    return NextResponse.json(
      { error: 'Reminder check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Mark reminder as sent in database
async function markReminderSent(tableName: string, bookingId: string, column: string) {
  await supabase
    .from(tableName)
    .update({
      [column]: true,
      [`${column}_at`]: new Date().toISOString()
    })
    .eq('id', bookingId)
}

// ── Type-aware SMS/email helpers ──────────────────────────────────

function get24hSms(booking: Booking, brandName: string): string {
  const time = formatTime(booking.appointment_time)
  const project = booking.project_name || 'your property search'
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `Hi ${booking.firstname}! Reminder — your Google Meet is tomorrow at ${time} to chat about ${project}. Check your calendar invite for the link. Looking forward to it!\n\n- ${brandName} Team`
    case 'visit_office':
      return `Hi ${booking.firstname}! Reminder — your office visit is tomorrow at ${time} at ${OFFICE_ADDRESS} to chat about ${project}. We look forward to seeing you!\n\n- ${brandName} Team`
    case 'builder_site_visit':
      return `Hi ${booking.firstname}! Reminder — your builder site visit is tomorrow at ${time} regarding ${project}. We'll contact you ~2 hours before with the site location and instructions.\n\n- ${brandName} Team`
    default:
      return `Hi ${booking.firstname}! Quick reminder - we'll call you tomorrow at ${time} to chat about ${project}. Looking forward to it!\n\n- ${brandName} Team`
  }
}

function get24hEmailBody(booking: Booking): string {
  const time = formatTime(booking.appointment_time)
  const project = booking.project_name ? ` for <strong>${booking.project_name}</strong>` : ''
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Quick reminder — your <strong>Google Meet</strong> is <strong>tomorrow</strong> at <strong>${time}</strong>${project}.</p>
        <p>Please check your calendar invite for the meeting link.</p>`
    case 'visit_office':
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Quick reminder — your <strong>office visit</strong> is <strong>tomorrow</strong> at <strong>${time}</strong>${project}.</p>
        <p>Our office address: <strong>${OFFICE_ADDRESS}</strong></p>
        <p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}" target="_blank" style="color:#3b82f6;">View on Google Maps</a></p>`
    case 'builder_site_visit':
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Quick reminder — your <strong>builder site visit</strong> is <strong>tomorrow</strong> at <strong>${time}</strong>${project}.</p>
        <p>We will contact you approximately <strong>2 hours before</strong> your appointment with the exact site location and instructions.</p>`
    default:
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Quick reminder — your appointment is <strong>tomorrow</strong> at <strong>${time}</strong>${project}.</p>
        <p>We will call you at your provided phone number. Please ensure you are available.</p>`
  }
}

function get1hSms(booking: Booking, brandName: string): string {
  const time = formatTime(booking.appointment_time)
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `Your Google Meet starts in 1 hour (${time}). Check your calendar invite for the link. Have your questions ready! 💻\n\n- ${brandName} Team`
    case 'visit_office':
      return `Your office visit is in 1 hour (${time}) at ${OFFICE_ADDRESS}. We look forward to seeing you! 🏢\n\n- ${brandName} Team`
    case 'builder_site_visit':
      return `Your builder site visit is in 1 hour (${time}). Expect a call shortly with the exact location and instructions. 🏗️\n\n- ${brandName} Team`
    default:
      return `We'll call you in 1 hour (${time}). Have your questions ready! 📞\n\n- ${brandName} Team`
  }
}

function get1hEmailBody(booking: Booking): string {
  const time = formatTime(booking.appointment_time)
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Your <strong>Google Meet</strong> starts in <strong>1 hour</strong> at <strong>${time}</strong>. Please check your calendar invite for the meeting link.</p>`
    case 'visit_office':
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Your <strong>office visit</strong> is in <strong>1 hour</strong> at <strong>${time}</strong>.</p>
        <p>Our address: <strong>${OFFICE_ADDRESS}</strong></p>`
    case 'builder_site_visit':
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Your <strong>builder site visit</strong> is in <strong>1 hour</strong> at <strong>${time}</strong>. Expect a call shortly with the exact location and instructions.</p>`
    default:
      return `<p>Hi <strong>${booking.firstname}</strong>,</p>
        <p>Your appointment is in <strong>1 hour</strong> at <strong>${time}</strong>. We will call you at your provided number. Have your questions ready!</p>`
  }
}

function get5minSms(booking: Booking, brandName: string): string {
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `Your Google Meet starts in 5 minutes! Join via your calendar invite. 💻\n\n- ${brandName} Team`
    case 'visit_office':
      return `Your office visit starts in 5 minutes! We're ready for you at ${OFFICE_ADDRESS}. 🏢\n\n- ${brandName} Team`
    case 'builder_site_visit':
      return `Your builder site visit starts in 5 minutes! 🏗️\n\n- ${brandName} Team`
    default:
      return `We're calling you in 5 minutes! 📞\n\n- ${brandName} Team`
  }
}

function getAdmin1hSms(booking: Booking): string {
  const name = `${booking.firstname} ${booking.lastname || ''}`.trim()
  const time = formatTime(booking.appointment_time)
  const project = booking.project_name || 'property inquiry'
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `💻 1 HOUR - Google Meet with ${name} about ${project} at ${time}. Join via calendar event.`
    case 'visit_office':
      return `🏢 1 HOUR - ${name} visiting office about ${project} at ${time}. Prepare meeting room.`
    case 'builder_site_visit':
      return `🏗️ 1 HOUR - Call ${name} at ${booking.phone} with builder site directions for ${project} at ${time}.`
    default:
      return `📞 1 HOUR - Call ${name} at ${booking.phone} about ${project} at ${time}`
  }
}

function getAdmin1hEmailHtml(booking: Booking): string {
  const name = `${booking.firstname} ${booking.lastname || ''}`.trim()
  const time = formatTime(booking.appointment_time)
  const project = booking.project_name || 'Property inquiry'
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `<p><strong>💻 1 HOUR – Upcoming Google Meet</strong></p>
        <p>Join the Google Meet with <strong>${name}</strong></p>
        <p>Project: ${project}</p>
        <p>Time: ${booking.appointment_date} at ${time}</p>
        <p>The Meet link is in the calendar event.</p>`
    case 'visit_office':
      return `<p><strong>🏢 1 HOUR – Customer Arriving at Office</strong></p>
        <p><strong>${name}</strong> is visiting the office</p>
        <p>Project: ${project}</p>
        <p>Time: ${booking.appointment_date} at ${time}</p>
        <p>Please prepare the meeting room.</p>`
    case 'builder_site_visit':
      return `<p><strong>🏗️ 1 HOUR – Builder Site Visit</strong></p>
        <p>Call <strong>${name}</strong> at ${booking.phone} with builder site directions</p>
        <p>Project: ${project}</p>
        <p>Time: ${booking.appointment_date} at ${time}</p>`
    default:
      return `<p><strong>📞 1 HOUR – Upcoming Call</strong></p>
        <p>Call <strong>${name}</strong> at ${booking.phone}</p>
        <p>Project: ${project}</p>
        <p>Time: ${booking.appointment_date} at ${time}</p>`
  }
}

function getAdmin15mSms(booking: Booking): string {
  const name = `${booking.firstname} ${booking.lastname || ''}`.trim()
  const project = booking.project_name || 'property inquiry'
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `💻 JOIN NOW - Google Meet with ${name} (${project}). Open calendar event.`
    case 'visit_office':
      return `🏢 ARRIVING NOW - ${name} at office for ${project}.`
    case 'builder_site_visit':
      return `🏗️ NOW - Ensure ${name} has site directions for ${project}. Call ${booking.phone} if needed.`
    default:
      return `📞 CALL NOW - ${name} at ${booking.phone} (${project})`
  }
}

function getAdmin15mEmailHtml(booking: Booking): string {
  const name = `${booking.firstname} ${booking.lastname || ''}`.trim()
  const time = formatTime(booking.appointment_time)
  const project = booking.project_name || 'Property inquiry'
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet':
      return `<p><strong>💻 JOIN NOW – 15 minutes until Google Meet</strong></p>
        <p>Join the Meet with <strong>${name}</strong></p>
        <p>Project: ${project}</p>
        <p>Time: ${booking.appointment_date} at ${time}</p>`
    case 'visit_office':
      return `<p><strong>🏢 ARRIVING NOW – 15 minutes until office visit</strong></p>
        <p><strong>${name}</strong> is arriving at the office</p>
        <p>Project: ${project}</p>`
    case 'builder_site_visit':
      return `<p><strong>🏗️ NOW – 15 minutes until builder site visit</strong></p>
        <p>Ensure <strong>${name}</strong> has directions. Call ${booking.phone} if needed.</p>
        <p>Project: ${project}</p>`
    default:
      return `<p><strong>📞 CALL NOW – 15 minutes until appointment</strong></p>
        <p>Call <strong>${name}</strong> at ${booking.phone}</p>
        <p>Project: ${project}</p>
        <p>Time: ${booking.appointment_date} at ${time}</p>`
  }
}

function getAdmin1hSubject(booking: Booking): string {
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet': return '1 HOUR – Upcoming Google Meet'
    case 'visit_office': return '1 HOUR – Customer Arriving at Office'
    case 'builder_site_visit': return '1 HOUR – Builder Site Visit'
    default: return '1 HOUR – Upcoming Call'
  }
}

function getAdmin15mSubject(booking: Booking): string {
  const mt = getMeetingFormat(booking)
  switch (mt) {
    case 'google_meet': return 'JOIN NOW – Google Meet in 15 min'
    case 'visit_office': return 'ARRIVING NOW – Office visit in 15 min'
    case 'builder_site_visit': return 'NOW – Builder site visit in 15 min'
    default: return 'CALL NOW – 15 min until appointment'
  }
}

// ── Reminder senders ─────────────────────────────────────────────

async function send24HourCustomerReminder(booking: Booking, brandName: string) {
  const smsMessage = get24hSms(booking, brandName)

  if (booking.phone && accountSid && authToken && twilioPhone) {
    try {
      await twilioClient.messages.create({ body: smsMessage, from: twilioPhone, to: toE164NorthAmerica(booking.phone) })
      console.log(`✅ 24-hour SMS reminder sent to ${booking.phone}`)
    } catch (err) {
      console.error(`24-hour SMS reminder failed for ${booking.phone}:`, err)
    }
  }

  await sendCustomerReminderEmail(booking, brandName, 'Appointment Reminder - Tomorrow', get24hEmailBody(booking))
}

async function send1HourCustomerReminder(booking: Booking, brandName: string) {
  const smsMessage = get1hSms(booking, brandName)

  if (booking.phone && accountSid && authToken && twilioPhone) {
    try {
      await twilioClient.messages.create({ body: smsMessage, from: twilioPhone, to: toE164NorthAmerica(booking.phone) })
      console.log(`✅ 1-hour SMS reminder sent to ${booking.phone}`)
    } catch (err) {
      console.error(`1-hour SMS reminder failed for ${booking.phone}:`, err)
    }
  }

  await sendCustomerReminderEmail(booking, brandName, 'Appointment in 1 Hour', get1hEmailBody(booking))
}

async function send5MinCustomerReminder(booking: Booking, brandName: string) {
  const smsMessage = get5minSms(booking, brandName)

  if (booking.phone && accountSid && authToken && twilioPhone) {
    try {
      await twilioClient.messages.create({ body: smsMessage, from: twilioPhone, to: toE164NorthAmerica(booking.phone) })
      console.log(`✅ 5-min SMS reminder sent to ${booking.phone}`)
    } catch (err) {
      console.error(`5-min SMS reminder failed for ${booking.phone}:`, err)
    }
  }
}

async function send1HourAdminReminder(booking: Booking, brandName: string) {
  const smsMessage = getAdmin1hSms(booking)
  await sendAdminReminderEmails(booking, brandName, getAdmin1hSubject(booking), getAdmin1hEmailHtml(booking))

  if (accountSid && authToken && twilioPhone) {
    await Promise.allSettled(
      notificationPhones.map(phone =>
        twilioClient.messages.create({ body: smsMessage, from: twilioPhone, to: toE164NorthAmerica(phone) })
      )
    )
  }
  console.log(`✅ 1-hour admin reminder sent`)
}

async function send15MinAdminReminder(booking: Booking, brandName: string) {
  const smsMessage = getAdmin15mSms(booking)
  await sendAdminReminderEmails(booking, brandName, getAdmin15mSubject(booking), getAdmin15mEmailHtml(booking))

  if (accountSid && authToken && twilioPhone) {
    await Promise.allSettled(
      notificationPhones.map(phone =>
        twilioClient.messages.create({ body: smsMessage, from: twilioPhone, to: toE164NorthAmerica(phone) })
      )
    )
  }
  console.log(`✅ 15-min admin reminder sent`)
}

async function sendAdminReminderEmails(booking: Booking, brandName: string, subject: string, htmlBody: string) {
  try {
    const mt = getMeetingFormat(booking)
    const icon = mt === 'google_meet' ? '💻' : mt === 'visit_office' ? '🏢' : mt === 'builder_site_visit' ? '🏗️' : '📞'
    const fullHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif">${htmlBody}</body></html>`
    for (const email of notificationEmails) {
      await emailTransporter.sendMail({
        from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
        to: email,
        subject: `${icon} ${brandName} ${subject}`,
        html: fullHtml
      })
    }
  } catch (err) {
    console.error('Error sending admin reminder emails:', err)
  }
}

async function sendCustomerReminderEmail(booking: Booking, brandName: string, subject: string, bodyHtml: string) {
  if (!booking.email) return
  const contact = getBrandContact(brandName)
  try {
    const fullHtml = `<!DOCTYPE html>
<html><head><style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
  .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
  .note { background: #fef3c7; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #f59e0b; font-size: 14px; }
  .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 13px; }
</style></head><body>
<div class="container">
  <div class="header"><h2>${subject}</h2></div>
  <div class="content">
    ${bodyHtml}
    <div class="note">
      <strong>Need to reschedule?</strong><br>
      📧 ${contact.email} &nbsp;|&nbsp; 📱 ${contact.phoneFormatted}
    </div>
    <p>— The ${brandName} Team</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} ${brandName}</div>
</div>
</body></html>`

    await emailTransporter.sendMail({
      from: `"${brandName}" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
      to: booking.email,
      subject: `⏰ ${brandName} – ${subject}`,
      html: fullHtml
    })
    console.log(`✅ Customer reminder email sent to ${booking.email}`)
  } catch (err) {
    console.error(`Customer reminder email failed for ${booking.email}:`, err)
  }
}
