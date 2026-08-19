import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import nodemailer from 'nodemailer'
import { appendBookingToGoogleSheet } from '@/lib/googleSheetsBookings'
import { resolveCustomerNotes } from '@/lib/customerNotes'
import {
  normalizeBookingPayload,
  resolveBookingFirstName,
  resolveBookingLastName,
} from '@/lib/normalizeBookingPayload'
import {
  INTERVIEW_BRAND_NAME,
  INTERVIEW_OFFICE_ADDRESS,
  isFahadSellsInterviewBooking,
} from '@/lib/interviewBookingConstants'
import { appendInterviewBookingToGoogleSheet } from '@/lib/interviewBookingsSheet'
import {
  buildInterviewAdminEmailDetailRows,
  buildInterviewAdminSmsDetails,
} from '@/lib/interviewBookingAdminDetails'
import {
  getInterviewManageLinkHtml,
  getInterviewManageLinkSms,
  resolveInterviewManageUrl,
} from '@/lib/interviewManageUrl'
import { interviewAlreadyNotified, markInterviewNotified } from '@/lib/markInterviewNotified'
import {
  buildInterviewResumeEmailHtml,
  buildInterviewResumeSmsLine,
  loadInterviewResumeAttachment,
} from '@/lib/interviewResume'

export const maxDuration = 60

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER
const notificationPhones = ['6478981739', '4168296121', '4163994289']
const notificationEmails = ['fahad@fahadsold.com', 'info@preconfactory.com']

const OFFICE_ADDRESS = '600 Matheson Blvd W, Mississauga, ON L5R 4C1'

function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

const client = twilio(accountSid, authToken)

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
})

function getBrandContact(source: string) {
  if (source === 'Fahad Javed Real Estate') {
    return { email: 'fahad@fahadsold.com', phone: '647.898.1739', phoneFormatted: '(647) 898-1739' }
  } else if (source === 'Precon Factory') {
    return { email: 'info@preconfactory.com', phone: '647.956.4063', phoneFormatted: '(647) 956-4063' }
  }
  return { email: 'gtalowrise01@gmail.com', phone: '416.399.4289', phoneFormatted: '(416) 399-4289' }
}

function typeLabel(t: string): string {
  switch (t) {
    case 'google_meet': return 'Google Meet'
    case 'visit_office': return 'Office Visit'
    case 'builder_site_visit': return 'Builder Site Visit'
    default: return 'Phone Call'
  }
}

function getAdminTypeInstruction(mt: string): string {
  switch (mt) {
    case 'google_meet': return '💻 ACTION: Join the Google Meet — link is in the calendar event.'
    case 'visit_office': return `🏢 ACTION: Customer will visit the office at ${OFFICE_ADDRESS}. Prepare the meeting room.`
    case 'builder_site_visit': return '🏗️ ACTION: Contact the customer ~2 hours before with the builder site location and instructions.'
    default: return '📞 ACTION: Call the customer at their provided phone number.'
  }
}

function getCustomerTypeHtml(mt: string, meetLink: string | null, brandContact: { phoneFormatted: string }): string {
  switch (mt) {
    case 'google_meet':
      return meetLink
        ? `<div style="background:#eff6ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #3b82f6;">
            <strong>💻 Virtual Meeting via Google Meet</strong><br>
            <p>Join the meeting using this link:</p>
            <a href="${meetLink}" target="_blank" style="display:inline-block;background:#1a73e8;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Join Google Meet</a>
            <p style="margin-top:8px;font-size:13px;color:#6b7280;">Or copy this link: ${meetLink}</p>
          </div>`
        : `<div style="background:#eff6ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #3b82f6;">
            <strong>💻 Virtual Meeting via Google Meet</strong><br>
            <p>A Google Meet link will be sent to you shortly. Please check your calendar invite.</p>
          </div>`
    case 'visit_office':
      return `<div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #22c55e;">
          <strong>🏢 Office Visit</strong><br>
          <p>Please visit our office at the scheduled time:</p>
          <p style="font-weight:bold;font-size:15px;">${OFFICE_ADDRESS}</p>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}" target="_blank" style="color:#3b82f6;">View on Google Maps</a>
        </div>`
    case 'builder_site_visit':
      return `<div style="background:#fefce8;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #eab308;">
          <strong>🏗️ Builder Site Visit</strong><br>
          <p>This is a builder site visit. You will be contacted approximately <strong>2 hours before</strong> your appointment with the exact site location and instructions.</p>
          <p>Please keep your phone available. If you have any questions, call us at <strong>${brandContact.phoneFormatted}</strong>.</p>
        </div>`
    default:
      return `<div style="background:#faf5ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #a855f7;">
          <strong>📞 Phone Call</strong><br>
          <p>We will call you at your provided phone number at the scheduled time. Please ensure you are available to take the call.</p>
          <p>If you need to reach us, call <strong>${brandContact.phoneFormatted}</strong>.</p>
        </div>`
  }
}

function getCustomerTypeSms(mt: string, meetLink: string | null, brandContact: { phoneFormatted: string }): string {
  switch (mt) {
    case 'google_meet':
      return meetLink
        ? `\n💻 This is a virtual meeting.\nJoin here: ${meetLink}`
        : '\n💻 This is a virtual meeting. A Google Meet link will be sent to you shortly — check your calendar invite.'
    case 'visit_office':
      return `\n🏢 Please visit our office at:\n${OFFICE_ADDRESS}`
    case 'builder_site_visit':
      return `\n🏗️ Builder site visit — you will be contacted ~2 hours before with the site location and instructions.`
    default:
      return `\n📞 We will call you at your phone number at the scheduled time. If you need to reach us: ${brandContact.phoneFormatted}`
  }
}

function getInterviewAdminInstruction(): string {
  return `🏢 ACTION: Candidate will interview in person at ${INTERVIEW_OFFICE_ADDRESS}.`
}

function getInterviewCandidateLocationHtml(): string {
  return `<div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #22c55e;">
          <strong>In-person interview</strong><br>
          <p>Please arrive at the scheduled date and time at:</p>
          <p style="font-weight:bold;font-size:15px;">${INTERVIEW_OFFICE_ADDRESS}</p>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(INTERVIEW_OFFICE_ADDRESS)}" target="_blank" style="color:#3b82f6;">View on Google Maps</a>
        </div>`
}

function getInterviewCandidateLocationSms(): string {
  return `\n🏢 Please arrive for your interview at:\n${INTERVIEW_OFFICE_ADDRESS}`
}

export async function POST(request: NextRequest) {
  try {
    const booking = await request.json()

    normalizeBookingPayload(booking)
    const firstname = resolveBookingFirstName(booking)
    const lastname = resolveBookingLastName(booking)
    booking.firstname = firstname
    booking.lastname = lastname

    if (!firstname || !booking.email) {
      return NextResponse.json({ error: 'Missing required booking data' }, { status: 400 })
    }

    const isInterview = isFahadSellsInterviewBooking(booking.table_name)
    const forceNotify = booking.force_notify === true

    if (isInterview && !forceNotify && interviewAlreadyNotified(booking.last_sync_source)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Interview notifications already sent.',
      })
    }

    const meetingFormat = isInterview
      ? 'visit_office'
      : (booking.meeting_format || booking.appointment_type || '').trim().toLowerCase()
    const displayType = isInterview ? 'In-Person Interview' : typeLabel(meetingFormat)

    const source = isInterview
      ? INTERVIEW_BRAND_NAME
      : booking.table_name === 'fj_bookings'
        ? 'Fahad Javed Real Estate'
        : booking.table_name === 'precon_factory_bookings'
          ? 'Precon Factory'
          : 'GTA Lowrise'
    const bookingPath = isInterview
      ? 'interview-bookings'
      : booking.table_name === 'fj_bookings' ? 'fj-bookings' :
      booking.table_name === 'precon_factory_bookings' ? 'precon-bookings' :
      'gta-lowrise-bookings'
    const dashboardUrl = `https://property-dashboard-three.vercel.app/${bookingPath}`
    const brandContact = getBrandContact(source)
    const customerNotes = resolveCustomerNotes(booking)
    const personLabel = isInterview ? 'Candidate' : 'Customer'
    const bookingKindLabel = isInterview ? 'Interview Booking' : 'Booking'
    const interviewManageUrl = isInterview
      ? resolveInterviewManageUrl(booking as Record<string, unknown>)
      : null

    // Interview candidate SMS first so Gmail delays cannot skip the text.
    let customerSmsResult = null
    if (isInterview && booking.phone && accountSid && authToken && twilioPhone) {
      try {
        customerSmsResult = await client.messages.create({
          body: `Interview confirmed — ${INTERVIEW_BRAND_NAME}

📅 ${booking.appointment_date || 'TBD'}
🕐 ${booking.appointment_time || 'TBD'}${getInterviewCandidateLocationSms()}${getInterviewManageLinkSms(interviewManageUrl)}

- ${INTERVIEW_BRAND_NAME}`,
          from: twilioPhone,
          to: toE164NorthAmerica(booking.phone)
        })
        console.log('Interview candidate SMS sent:', customerSmsResult.sid)
      } catch (smsError) {
        console.error('Error sending interview candidate SMS:', smsError)
      }
    }

    // ── 1. Admin SMS ──────────────────────────────────────────────
    let message = isInterview
      ? `🔔 New ${source} Interview Booking!\n\n👤 Candidate: ${firstname} ${lastname || ''}`
      : `🔔 New ${source} Booking!\n\n👤 ${firstname} ${lastname || ''}`
    message += `
📧 ${booking.email}
📱 ${booking.phone || 'No phone'}`

    if (booking.project_name) message += `\n🏢 Project: ${booking.project_name}`
    if (booking.project_id) message += `\n🆔 Project ID: ${booking.project_id}`

    message += `\n📅 Date: ${booking.appointment_date || 'Not specified'}
🕐 Time: ${booking.appointment_time || 'Not specified'}
🎯 Type: ${displayType}
${isInterview ? getInterviewAdminInstruction() : getAdminTypeInstruction(meetingFormat)}`

    if (isInterview) {
      message += buildInterviewAdminSmsDetails(booking as Record<string, unknown>)
      message += buildInterviewResumeSmsLine(booking as Record<string, unknown>)
    }

    if (customerNotes) message += `\n💬 Message: ${customerNotes}`
    if (booking.project_url) message += `\n🌐 Project URL: ${booking.project_url}`
    if (booking.status) message += `\n📊 Status: ${booking.status}`
    message += `\n⏰ Just now\n\n👉 View in Dashboard: ${dashboardUrl}`

    const twilioResponses: { phone: string; sid?: string; error?: string }[] = []
    if (!isInterview) {
      try {
        if (!accountSid || !authToken || !twilioPhone) {
          for (const phone of notificationPhones) twilioResponses.push({ phone, error: 'Twilio not configured' })
        } else {
          const results = await Promise.allSettled(
            notificationPhones.map(async rawPhone => {
              const to = toE164NorthAmerica(rawPhone)
              const msg = await client.messages.create({ body: message, from: twilioPhone, to })
              return { rawPhone, sid: msg.sid }
            })
          )
          for (let i = 0; i < results.length; i++) {
            const phone = notificationPhones[i]
            const r = results[i]
            if (r.status === 'fulfilled') {
              twilioResponses.push({ phone, sid: r.value.sid })
            } else {
              twilioResponses.push({ phone, error: r.reason instanceof Error ? r.reason.message : String(r.reason) })
            }
          }
        }
      } catch (smsError) {
        console.error('Error sending admin SMS batch:', smsError)
        for (const phone of notificationPhones) {
          if (!twilioResponses.some(t => t.phone === phone)) {
            twilioResponses.push({ phone, error: smsError instanceof Error ? smsError.message : String(smsError) })
          }
        }
      }
    }

    // ── 2. Admin email ────────────────────────────────────────────
    const adminEmailResults: { email: string; messageId?: string; error?: string }[] = []
    const interviewResumeAttachment = isInterview
      ? await loadInterviewResumeAttachment(booking as Record<string, unknown>)
      : null
    try {
      const adminActionHtml = `
        <div style="background:#fef3c7;padding:14px;border-radius:8px;margin:16px 0;border-left:4px solid #f59e0b;">
          <strong>${isInterview ? getInterviewAdminInstruction() : getAdminTypeInstruction(meetingFormat)}</strong>
        </div>`

      const adminEmailHtml = `<!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-label { font-weight: bold; min-width: 140px; color: #6b7280; }
        .detail-value { color: #111827; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style></head><body><div class="container">
        <div class="header">
          <h1>🔔 New ${isInterview ? 'Interview ' : ''}Booking Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${source}${isInterview ? ' — Fahad Sells' : ''}</p>
        </div>
        <div class="content">
          <h2 style="color: #111827; margin-top: 0;">${bookingKindLabel} Details</h2>
          ${adminActionHtml}
          <div class="booking-details">
            <div class="detail-row"><div class="detail-label">👤 ${personLabel}:</div><div class="detail-value">${firstname} ${lastname || ''}</div></div>
            <div class="detail-row"><div class="detail-label">📧 Email:</div><div class="detail-value"><a href="mailto:${booking.email}">${booking.email}</a></div></div>
            <div class="detail-row"><div class="detail-label">📱 Phone:</div><div class="detail-value"><a href="tel:${booking.phone || ''}">${booking.phone || 'Not provided'}</a></div></div>
            <div class="detail-row"><div class="detail-label">📅 Date:</div><div class="detail-value">${booking.appointment_date || 'Not specified'}</div></div>
            <div class="detail-row"><div class="detail-label">🕐 Time:</div><div class="detail-value">${booking.appointment_time || 'Not specified'}</div></div>
            <div class="detail-row"><div class="detail-label">🎯 Type:</div><div class="detail-value">${displayType}</div></div>
            ${booking.project_name ? `<div class="detail-row"><div class="detail-label">🏢 Project:</div><div class="detail-value">${booking.project_name}</div></div>` : ''}
            ${booking.project_id ? `<div class="detail-row"><div class="detail-label">🆔 Project ID:</div><div class="detail-value">${booking.project_id}</div></div>` : ''}
            ${booking.project_url ? `<div class="detail-row"><div class="detail-label">🌐 Project Link:</div><div class="detail-value"><a href="${booking.project_url}" target="_blank" style="color: #3b82f6;">View Project</a></div></div>` : ''}
            ${isInterview ? buildInterviewAdminEmailDetailRows(booking as Record<string, unknown>) : ''}
            ${customerNotes ? `<div class="detail-row"><div class="detail-label">💬 Message:</div><div class="detail-value">${customerNotes}</div></div>` : ''}
          </div>
          ${isInterview ? buildInterviewResumeEmailHtml(booking as Record<string, unknown>) : ''}
          ${isInterview ? `<div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" class="button">👉 View in Dashboard</a>
          </div>` : `<div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" class="button">👉 View in Dashboard</a>
            ${booking.project_url ? `<a href="${booking.project_url}" class="button" style="background: #8b5cf6;">🌐 View Project</a>` : ''}
          </div>`}
        </div>
        <div class="footer"><p>Automated notification from Property Dashboard</p><p>&copy; ${new Date().getFullYear()} Property Dashboard</p></div>
      </div></body></html>`

      const adminMailResults = await Promise.allSettled(
        notificationEmails.map(async email => {
          const result = await emailTransporter.sendMail({
            from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
            to: email,
            subject: `🔔 New ${source} ${isInterview ? 'Interview ' : ''}Booking (${displayType}) - ${firstname} ${lastname || ''}`,
            html: adminEmailHtml,
            attachments: interviewResumeAttachment ? [interviewResumeAttachment] : undefined,
          })
          return { email, messageId: result.messageId }
        })
      )
      for (let i = 0; i < adminMailResults.length; i++) {
        const email = notificationEmails[i]
        const r = adminMailResults[i]
        if (r.status === 'fulfilled') adminEmailResults.push(r.value)
        else adminEmailResults.push({ email, error: r.reason instanceof Error ? r.reason.message : String(r.reason) })
      }
    } catch (emailError) {
      console.error('Error sending admin emails:', emailError)
    }

    // ── 3. Create calendar event FIRST (needed to get Meet link) ──
    let calendarEvent: { meetLink?: string; eventId?: string; htmlLink?: string } | null = null
    const existingCalendarEventId =
      typeof booking.calendar_event_id === 'string' ? booking.calendar_event_id.trim() : ''
    try {
      if (existingCalendarEventId) {
        calendarEvent = { eventId: existingCalendarEventId }
        console.log('Skipping calendar create; event already exists:', existingCalendarEventId)
      } else {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_BASE_URL || 'https://property-dashboard-three.vercel.app'

        const calendarResponse = await fetch(`${baseUrl}/api/bookings/create-calendar-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...booking,
            table_name: booking.table_name || (
              isInterview ? 'fahad_sells_interview_bookings' :
              source === 'Fahad Javed Real Estate' ? 'fj_bookings' :
              source === 'Precon Factory' ? 'precon_factory_bookings' :
              'gta_lowrise_bookings'
            )
          })
        })

        if (calendarResponse.ok) {
          calendarEvent = await calendarResponse.json()
          console.log('Calendar event created:', calendarEvent)
        } else {
          console.error('Failed to create calendar event:', await calendarResponse.text())
        }
      }
    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError)
    }

    const meetLink = calendarEvent?.meetLink || null

    // ── 4. Candidate / customer confirmation email ──
    let customerEmailResult = null
    try {
      const typeSpecificHtml = isInterview
        ? getInterviewCandidateLocationHtml()
        : getCustomerTypeHtml(meetingFormat, meetLink, brandContact)

      const customerEmailHtml = isInterview
        ? `<!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .confirmation { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .detail-row { padding: 10px 0; }
        .detail-label { font-weight: bold; color: #6b7280; display: inline-block; min-width: 100px; }
        .detail-value { color: #111827; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style></head><body><div class="container">
        <div class="header">
          <h1>Interview confirmed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${INTERVIEW_BRAND_NAME}</p>
        </div>
        <div class="content">
          <p>Hi <strong>${firstname}</strong>,</p>
          <p>Your interview has been scheduled. Here are the details:</p>
          <div class="confirmation">
            <div class="detail-row"><span class="detail-label">Date:</span><span class="detail-value">${booking.appointment_date || 'Not specified'}</span></div>
            <div class="detail-row"><span class="detail-label">Time:</span><span class="detail-value">${booking.appointment_time || 'Not specified'}</span></div>
            <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${displayType}</span></div>
          </div>
          ${typeSpecificHtml}
          ${getInterviewManageLinkHtml(interviewManageUrl)}
          <p>We look forward to meeting you.</p>
          <p><strong>Best regards,</strong><br>${INTERVIEW_BRAND_NAME}</p>
        </div>
        <div class="footer"><p>This is an automated confirmation email</p><p>&copy; ${new Date().getFullYear()} ${INTERVIEW_BRAND_NAME}</p></div>
      </div></body></html>`
        : `<!DOCTYPE html><html><head><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .confirmation { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .detail-row { padding: 10px 0; }
        .detail-label { font-weight: bold; color: #6b7280; display: inline-block; min-width: 100px; }
        .detail-value { color: #111827; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        .note { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
      </style></head><body><div class="container">
        <div class="header">
          <h1>✅ Appointment Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">We look forward to meeting with you</p>
        </div>
        <div class="content">
          <p>Hi <strong>${booking.firstname}</strong>,</p>
          <p>Your appointment has been successfully confirmed. Here are the details:</p>
          <div class="confirmation">
            <div class="detail-row"><span class="detail-label">📅 Date:</span><span class="detail-value">${booking.appointment_date || 'Not specified'}</span></div>
            <div class="detail-row"><span class="detail-label">🕐 Time:</span><span class="detail-value">${booking.appointment_time || 'Not specified'}</span></div>
            <div class="detail-row"><span class="detail-label">🎯 Type:</span><span class="detail-value">${displayType}</span></div>
            ${booking.project_name ? `<div class="detail-row"><span class="detail-label">🏢 Project:</span><span class="detail-value">${booking.project_name}</span></div>` : ''}
            ${booking.project_url ? `<div class="detail-row"><span class="detail-label">🌐 Project:</span><span class="detail-value"><a href="${booking.project_url}" target="_blank" style="color: #3b82f6;">View Project Details</a></span></div>` : ''}
          </div>
          ${typeSpecificHtml}
          <div class="note">
            <strong>⚠️ Need to reschedule?</strong><br>
            Please contact us as soon as possible:<br>
            📧 Email: ${brandContact.email}<br>
            📱 Phone: ${brandContact.phoneFormatted}
          </div>
          <p>We're excited to help you find your perfect property!</p>
          <p><strong>Best regards,</strong><br>The ${source} Team</p>
        </div>
        <div class="footer"><p>This is an automated confirmation email</p><p>&copy; ${new Date().getFullYear()} ${source}</p></div>
      </div></body></html>`

      const customerSubject = isInterview
        ? `Interview confirmed — ${booking.appointment_date || 'Upcoming'} at ${booking.appointment_time || 'TBD'}`
        : `✅ Appointment Confirmed (${displayType}) - ${booking.appointment_date || 'Upcoming'} at ${booking.appointment_time || 'TBD'}`

      customerEmailResult = await emailTransporter.sendMail({
        from: `"${source}" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
        to: booking.email,
        subject: customerSubject,
        html: customerEmailHtml
      })
      console.log('Customer confirmation email sent:', customerEmailResult.messageId)
    } catch (emailError) {
      console.error('Error sending customer confirmation email:', emailError)
    }

    // ── 5. Customer confirmation SMS (property bookings only; interviews already sent above) ──
    try {
      if (!isInterview && booking.phone && accountSid && authToken && twilioPhone) {
        const customerSmsMessage = `✅ Appointment Confirmed!

📅 ${booking.appointment_date || 'TBD'}
🕐 ${booking.appointment_time || 'TBD'}
${booking.project_name ? `🏢 ${booking.project_name}\n` : ''}${getCustomerTypeSms(meetingFormat, meetLink, brandContact)}

Need to reschedule? Call ${brandContact.phoneFormatted}

- ${source} Team`

        customerSmsResult = await client.messages.create({
          body: customerSmsMessage,
          from: twilioPhone,
          to: toE164NorthAmerica(booking.phone)
        })
        console.log('Customer confirmation SMS sent:', customerSmsResult.sid)
      }
    } catch (smsError) {
      console.error('Error sending customer confirmation SMS:', smsError)
    }

    // Append booking to Google Sheet (non-blocking, won't break existing flow)
    try {
      if (isInterview) {
        await appendInterviewBookingToGoogleSheet(booking)
      } else {
        await appendBookingToGoogleSheet(booking)
      }
    } catch (sheetError) {
      console.error('Google Sheets error (non-critical):', sheetError)
    }

    // ── Response ──────────────────────────────────────────────────
    if (isInterview) {
      const notified =
        !!customerSmsResult?.sid ||
        !!customerEmailResult?.messageId ||
        adminEmailResults.some(r => r.messageId)
      if (notified) {
        await markInterviewNotified(booking.id, 'notify')
      }
    }

    console.log('Booking notifications sent:', {
      bookingId: booking.id, source, meetingFormat, displayType,
      adminSms: twilioResponses, adminEmails: adminEmailResults,
      customerEmail: customerEmailResult?.messageId || null,
      customerSms: customerSmsResult?.sid || null,
      calendarEvent: calendarEvent?.eventId || null,
      meetLink,
    })

    return NextResponse.json({
      success: true,
      adminSms: twilioResponses,
      messageSids: twilioResponses.map(r => r.sid).filter(Boolean),
      recipients: notificationPhones,
      adminEmails: adminEmailResults,
      customerEmail: customerEmailResult?.messageId || null,
      customerSms: customerSmsResult?.sid || null,
      booking: `${firstname} ${lastname}`,
      source,
      calendarEvent: calendarEvent || null,
      meetLink,
    })

  } catch (error) {
    console.error('Error sending booking notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

