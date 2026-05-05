import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import nodemailer from 'nodemailer'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER
const notificationPhones = ['6478981739', '4168296121', '4163994289'] // Notification recipients (10-digit NA; normalized to E.164 below)
const notificationEmails = ['info@fahadsold.com', 'info@preconfactory.com'] // Admin email recipients

/** Twilio expects E.164 (e.g. +16478981739). Raw 10-digit numbers often fail. */
function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

const client = twilio(accountSid, authToken)

// Gmail SMTP configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

// Brand-specific contact information
function getBrandContact(source: string) {
  if (source === 'FJ') {
    return {
      email: 'info@fahadsold.com',
      phone: '647.898.1739',
      phoneFormatted: '(647) 898-1739'
    }
  } else if (source === 'Precon Factory') {
    return {
      email: 'info@preconfactory.com',
      phone: '647.956.4063',
      phoneFormatted: '(647) 956-4063'
    }
  } else { // GTA Lowrise
    return {
      email: 'gtalowrise01@gmail.com',
      phone: '416.399.4289',
      phoneFormatted: '(416) 399-4289'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const booking = await request.json()

    // Validate required fields
    if (!booking.firstname || !booking.email) {
      return NextResponse.json(
        { error: 'Missing required booking data' },
        { status: 400 }
      )
    }

    // Note: project_name, project_id, and URL fields don't exist in booking tables
    // They are passed via query params from the booking form

    // Determine source
    const source = 
      booking.table_name === 'fj_bookings' ? 'FJ' :
      booking.table_name === 'precon_factory_bookings' ? 'Precon Factory' :
      'GTA Lowrise'
    const bookingPath = 
      booking.table_name === 'fj_bookings' ? 'fj-bookings' :
      booking.table_name === 'precon_factory_bookings' ? 'precon-bookings' :
      'gta-lowrise-bookings'
    const dashboardUrl = `https://property-dashboard-three.vercel.app/${bookingPath}`
    
    // Format the notification message
    let message = `🔔 New ${source} Booking!

👤 ${booking.firstname} ${booking.lastname || ''}
📧 ${booking.email}
📱 ${booking.phone || 'No phone'}`
    
    // Add project information
    if (booking.project_name) {
      message += `\n🏢 Project: ${booking.project_name}`
    }
    
    if (booking.project_id) {
      message += `\n🆔 Project ID: ${booking.project_id}`
    }
    
    message += `\n📅 Date: ${booking.appointment_date || 'Not specified'}
🕐 Time: ${booking.appointment_time || 'Not specified'}
🎯 Type: ${booking.appointment_type || 'Not specified'}`
    
    // Add booking message if available
    if (booking.message) {
      message += `\n💬 Message: ${booking.message}`
    }
    
    if (booking.project_url) {
      message += `\n🌐 Project URL: ${booking.project_url}`
    }

    // Add status if available
    if (booking.status) {
      message += `\n📊 Status: ${booking.status}`
    }
    
    message += `\n⏰ Just now

👉 View in Dashboard: ${dashboardUrl}`

    // Send admin email notifications FIRST — if Twilio fails, admins still get email
    const adminEmailResults: { email: string; messageId?: string; error?: string }[] = []
    try {
      const adminEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 New Booking Alert</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">${source}</p>
            </div>
            
            <div class="content">
              <h2 style="color: #111827; margin-top: 0;">Booking Details</h2>
              
              <div class="booking-details">
                <div class="detail-row">
                  <div class="detail-label">👤 Customer:</div>
                  <div class="detail-value">${booking.firstname} ${booking.lastname || ''}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">📧 Email:</div>
                  <div class="detail-value"><a href="mailto:${booking.email}">${booking.email}</a></div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">📱 Phone:</div>
                  <div class="detail-value"><a href="tel:${booking.phone || ''}">${booking.phone || 'Not provided'}</a></div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">📅 Date:</div>
                  <div class="detail-value">${booking.appointment_date || 'Not specified'}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">🕐 Time:</div>
                  <div class="detail-value">${booking.appointment_time || 'Not specified'}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">🎯 Type:</div>
                  <div class="detail-value">${booking.appointment_type || 'Not specified'}</div>
                </div>
                ${booking.project_name ? `
                <div class="detail-row">
                  <div class="detail-label">🏢 Project:</div>
                  <div class="detail-value">${booking.project_name}</div>
                </div>` : ''}
                ${booking.project_id ? `
                <div class="detail-row">
                  <div class="detail-label">🆔 Project ID:</div>
                  <div class="detail-value">${booking.project_id}</div>
                </div>` : ''}
                ${booking.project_url ? `
                <div class="detail-row">
                  <div class="detail-label">🌐 Project Link:</div>
                  <div class="detail-value"><a href="${booking.project_url}" target="_blank" style="color: #3b82f6;">View Project</a></div>
                </div>` : ''}
                ${booking.message ? `
                <div class="detail-row">
                  <div class="detail-label">💬 Message:</div>
                  <div class="detail-value">${booking.message}</div>
                </div>` : ''}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" class="button">👉 View in Dashboard</a>
                ${booking.project_url ? `<a href="${booking.project_url}" class="button" style="background: #8b5cf6;">🌐 View Project</a>` : ''}
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from your Property Dashboard</p>
              <p>© ${new Date().getFullYear()} Property Dashboard</p>
            </div>
          </div>
        </body>
        </html>
      `

      for (const email of notificationEmails) {
        try {
          const result = await emailTransporter.sendMail({
            from: `"Property Dashboard" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
            to: email,
            subject: `🔔 New ${source} Booking - ${booking.firstname} ${booking.lastname || ''}`,
            html: adminEmailHtml
          })
          adminEmailResults.push({ email, messageId: result.messageId })
        } catch (perEmailErr) {
          const msg = perEmailErr instanceof Error ? perEmailErr.message : String(perEmailErr)
          console.error('Error sending admin email to', email, perEmailErr)
          adminEmailResults.push({ email, error: msg })
        }
      }

      console.log('Admin emails sent:', adminEmailResults)
    } catch (emailError) {
      console.error('Error sending admin emails:', emailError)
      // Don't fail the notification if email fails
    }

    // Admin SMS — isolated so Twilio/env issues don't block emails or customer notifications
    const twilioResponses: { phone: string; sid?: string; error?: string }[] = []
    try {
      if (!accountSid || !authToken || !twilioPhone) {
        console.error(
          'Admin SMS skipped: missing Twilio env (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)'
        )
        for (const phone of notificationPhones) {
          twilioResponses.push({ phone, error: 'Twilio not configured' })
        }
      } else {
        const results = await Promise.allSettled(
          notificationPhones.map(async rawPhone => {
            const to = toE164NorthAmerica(rawPhone)
            const msg = await client.messages.create({
              body: message,
              from: twilioPhone,
              to
            })
            return { rawPhone, sid: msg.sid }
          })
        )
        for (let i = 0; i < results.length; i++) {
          const phone = notificationPhones[i]
          const r = results[i]
          if (r.status === 'fulfilled') {
            twilioResponses.push({ phone, sid: r.value.sid })
          } else {
            const err = r.reason instanceof Error ? r.reason.message : String(r.reason)
            console.error('Twilio SMS failed for admin', phone, r.reason)
            twilioResponses.push({ phone, error: err })
          }
        }
      }
    } catch (smsError) {
      console.error('Error sending admin SMS batch:', smsError)
      for (const phone of notificationPhones) {
        if (!twilioResponses.some(t => t.phone === phone)) {
          twilioResponses.push({
            phone,
            error: smsError instanceof Error ? smsError.message : String(smsError)
          })
        }
      }
    }

    // Send customer confirmation email
    let customerEmailResult = null
    try {
      const brandContact = getBrandContact(source)
      const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
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
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Appointment Confirmed!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">We look forward to meeting with you</p>
            </div>
            
            <div class="content">
              <p>Hi <strong>${booking.firstname}</strong>,</p>
              <p>Your appointment has been successfully confirmed. Here are the details:</p>
              
              <div class="confirmation">
                <div class="detail-row">
                  <span class="detail-label">📅 Date:</span>
                  <span class="detail-value">${booking.appointment_date || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕐 Time:</span>
                  <span class="detail-value">${booking.appointment_time || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🎯 Type:</span>
                  <span class="detail-value">${booking.appointment_type || 'Not specified'}</span>
                </div>
                ${booking.project_name ? `
                <div class="detail-row">
                  <span class="detail-label">🏢 Project:</span>
                  <span class="detail-value">${booking.project_name}</span>
                </div>` : ''}
                ${booking.project_id ? `
                <div class="detail-row">
                  <span class="detail-label">🆔 Project ID:</span>
                  <span class="detail-value">${booking.project_id}</span>
                </div>` : ''}
                ${booking.project_url ? `
                <div class="detail-row">
                  <span class="detail-label">🌐 Project:</span>
                  <span class="detail-value"><a href="${booking.project_url}" target="_blank" style="color: #3b82f6;">View Project Details</a></span>
                </div>` : ''}
              </div>

              <div class="note">
                <strong>⚠️ Need to reschedule?</strong><br>
                Please contact us as soon as possible:<br>
                📧 Email: ${brandContact.email}<br>
                📱 Phone: ${brandContact.phoneFormatted}
              </div>

              <p>We're excited to help you find your perfect property!</p>
              <p><strong>Best regards,</strong><br>The ${source} Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated confirmation email</p>
              <p>© ${new Date().getFullYear()} ${source}</p>
            </div>
          </div>
        </body>
        </html>
      `

      customerEmailResult = await emailTransporter.sendMail({
        from: `"${source}" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
        to: booking.email,
        subject: `✅ Appointment Confirmed - ${booking.appointment_date || 'Upcoming'} at ${booking.appointment_time || 'TBD'}`,
        html: customerEmailHtml
      })
      
      console.log('Customer confirmation email sent:', customerEmailResult.messageId)
    } catch (emailError) {
      console.error('Error sending customer confirmation email:', emailError)
      // Don't fail the notification if email fails
    }

    // Send customer confirmation SMS
    let customerSmsResult = null
    try {
      if (booking.phone && accountSid && authToken && twilioPhone) {
        const brandContact = getBrandContact(source)
        const customerSmsMessage = `✅ Appointment Confirmed!

📅 ${booking.appointment_date || 'TBD'}
🕐 ${booking.appointment_time || 'TBD'}
${booking.project_name ? `🏢 ${booking.project_name}` : ''}

Need to reschedule? Call ${brandContact.phoneFormatted}

- ${source} Team`

        const customerTo = toE164NorthAmerica(booking.phone)
        customerSmsResult = await client.messages.create({
          body: customerSmsMessage,
          from: twilioPhone,
          to: customerTo
        })
        
        console.log('Customer confirmation SMS sent:', customerSmsResult.sid)
      } else if (booking.phone && (!accountSid || !authToken || !twilioPhone)) {
        console.error('Customer confirmation SMS skipped: Twilio env not configured')
      }
    } catch (smsError) {
      console.error('Error sending customer confirmation SMS:', smsError)
    }

    // Create Google Calendar event
    let calendarEvent = null
    try {
      // Determine the base URL for API calls
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXT_PUBLIC_BASE_URL || 'https://property-dashboard-three.vercel.app'
      
      const calendarResponse = await fetch(`${baseUrl}/api/bookings/create-calendar-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...booking,
          table_name: booking.table_name || (
            source === 'FJ' ? 'fj_bookings' :
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
    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError)
      // Don't fail the notification if calendar creation fails
    }

    const adminSmsErrors = twilioResponses.filter(t => t.error)
    if (adminSmsErrors.length > 0) {
      console.warn('Some admin SMS failed:', adminSmsErrors)
    }

    console.log('Booking notifications sent:', {
      bookingId: booking.id,
      source: source,
      recipients: notificationPhones,
      adminSms: twilioResponses,
      adminEmails: adminEmailResults,
      customerEmail: customerEmailResult?.messageId || null,
      customerSms: customerSmsResult?.sid || null,
      calendarEvent: calendarEvent?.eventId || null
    })

    return NextResponse.json({
      success: true,
      adminSms: twilioResponses,
      messageSids: twilioResponses.map(r => r.sid).filter(Boolean),
      recipients: notificationPhones,
      adminEmails: adminEmailResults,
      customerEmail: customerEmailResult?.messageId || null,
      customerSms: customerSmsResult?.sid || null,
      booking: `${booking.firstname} ${booking.lastname}`,
      source: source,
      calendarEvent: calendarEvent || null
    })

  } catch (error) {
    console.error('Error sending booking notification:', error)
    
    // Don't fail the booking insertion if notification fails
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

