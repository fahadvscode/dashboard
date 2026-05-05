import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Unified Qikfill OAuth credentials for info@qikfill.com Google Workspace
const QIKFILL_CLIENT_ID = process.env.QIKFILL_GOOGLE_CLIENT_ID!
const QIKFILL_CLIENT_SECRET = process.env.QIKFILL_GOOGLE_CLIENT_SECRET!

// Calendar IDs for each brand (all under info@qikfill.com workspace)
const CALENDAR_IDS = {
  fj: 'c_c0a660e131ad53344fa1d41404b0beafcde60bc4ea44e19020ad14eb84bcd46d@group.calendar.google.com',
  precon: 'c_30f7e817768b30f4813c9711b2f66fa238221af7a6ba0fb5d284de514afeb400@group.calendar.google.com',
  gtalowrise: 'c_c702f7be6ca9312d4fccf118aaff244390379e2b07f3f5ef47b3ee609fa49475@group.calendar.google.com'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize Google Calendar client with unified OAuth
async function getCalendarClient() {
  const { google } = await import('googleapis')
  const oauth2Client = new google.auth.OAuth2(
    QIKFILL_CLIENT_ID,
    QIKFILL_CLIENT_SECRET
  )

  // Get unified token from database
  const { data: tokenData, error } = await supabase
    .from('calendar_tokens')
    .select('*')
    .eq('calendar_type', 'qikfill')
    .single()

  if (error || !tokenData) {
    throw new Error('Qikfill calendar not authorized. Please authorize the calendar at /api/calendar/oauth')
  }

  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date
  })

  // Refresh token if expired
  if (tokenData.expiry_date && new Date(tokenData.expiry_date) <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    // Update stored tokens
    await supabase
      .from('calendar_tokens')
      .update({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      })
      .eq('calendar_type', 'qikfill')

    oauth2Client.setCredentials(credentials)
  }

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function POST(request: NextRequest) {
  try {
    const booking = await request.json()

    // Validate required fields
    if (!booking.firstname || !booking.email || !booking.appointment_date || !booking.appointment_time) {
      return NextResponse.json(
        { error: 'Missing required booking data' },
        { status: 400 }
      )
    }

    // Determine which calendar to use based on booking source
    const tableName = booking.table_name || booking.source || ''
    let calendarId: string
    let brandName: string

    if (tableName.includes('gta_lowrise') || tableName.includes('gtalowrise')) {
      calendarId = CALENDAR_IDS.gtalowrise
      brandName = 'GTA Lowrise'
    } else if (tableName.includes('precon')) {
      calendarId = CALENDAR_IDS.precon
      brandName = 'Precon Factory'
    } else if (tableName.includes('fj')) {
      calendarId = CALENDAR_IDS.fj
      brandName = 'FJ'
    } else {
      // Default to FJ calendar
      calendarId = CALENDAR_IDS.fj
      brandName = 'FJ'
    }

    // Parse appointment date and time
    const appointmentDate = booking.appointment_date // Format: YYYY-MM-DD
    const appointmentTime = booking.appointment_time // Format: "10:00 AM" or "14:30"
    
    // Parse time (handles formats like "10:00 AM", "14:30", etc.)
    let hours = 0
    let minutes = 0
    const timeMatch = appointmentTime.match(/(\d+):(\d+)\s*(AM|PM)?/i)
    if (timeMatch) {
      hours = parseInt(timeMatch[1])
      minutes = parseInt(timeMatch[2])
      const period = timeMatch[3]?.toUpperCase()
      if (period === 'PM' && hours !== 12) hours += 12
      if (period === 'AM' && hours === 12) hours = 0
    }

    // Create datetime string in local format (without timezone)
    // Google Calendar will interpret this as the timezone specified in the event
    const timezone = 'America/Toronto'
    const startDateTimeLocal = `${appointmentDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
    
    // Calculate end time (30 minutes later)
    const endHours = hours
    const endMinutes = minutes + 30
    const adjustedEndHours = endMinutes >= 60 ? endHours + 1 : endHours
    const adjustedEndMinutes = endMinutes >= 60 ? endMinutes - 60 : endMinutes
    const endDateTimeLocal = `${appointmentDate}T${String(adjustedEndHours).padStart(2, '0')}:${String(adjustedEndMinutes).padStart(2, '0')}:00`

    // Build event title
    let eventTitle = `Booking: ${booking.firstname} ${booking.lastname || ''}`
    if (booking.project_name) {
      eventTitle += ` - ${booking.project_name}`
    }

    // Build event description
    let description = `📞 PHONE CALL APPOINTMENT\n\n`
    description += `Customer Details:\n`
    description += `Name: ${booking.firstname} ${booking.lastname || ''}\n`
    description += `Email: ${booking.email}\n`
    description += `Phone: ${booking.phone || 'Not provided'}\n`
    description += `Appointment Type: ${booking.appointment_type || 'Not specified'}\n\n`
    
    description += `📋 Meeting Details:\n`
    description += `This is a phone call appointment. We will call the customer at their provided number.\n`
    description += `If customer needs to reach us: (647) 898-1739\n\n`
    
    if (booking.project_name) {
      description += `Project: ${booking.project_name}\n`
    }
    if (booking.project_id) {
      description += `Project ID: ${booking.project_id}\n`
    }
    if (booking.project_url) {
      description += `Project URL: ${booking.project_url}\n`
    }
    if (booking.message) {
      description += `\n💬 Customer Message:\n${booking.message}\n`
    }

    // Create calendar event using unified OAuth client
    const calendar = await getCalendarClient()
    
    // Set location as Phone Call with brand-specific contact number
    const brandPhone = brandName === 'FJ' ? '(647) 898-1739' : 
                       brandName === 'Precon Factory' ? '(647) 956-4063' : 
                       '(416) 399-4289' // GTA Lowrise
    const phoneNumber = brandPhone
    const location = `📞 Phone Call - ${phoneNumber}`
    
    // Enhanced event title with brand name
    const enhancedTitle = `${brandName} - ${eventTitle}`
    
    const event = {
      summary: enhancedTitle,
      description: description,
      start: {
        dateTime: startDateTimeLocal,
        timeZone: timezone,
      },
      end: {
        dateTime: endDateTimeLocal,
        timeZone: timezone,
      },
      attendees: [
        { 
          email: booking.email, 
          displayName: `${booking.firstname} ${booking.lastname || ''}`,
          responseStatus: 'accepted' // Mark customer as accepted
        }
      ],
      location: location,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 } // 1 hour before
        ],
      },
      conferenceData: {
        notes: `This is a phone call appointment.\n\nWe will call you at: ${booking.phone || 'your provided number'}\n\nIf you need to reach us, call: ${phoneNumber}`
      },
      source: {
        title: `${brandName} Booking System`,
        url: booking.project_url || 'https://property-dashboard-three.vercel.app'
      }
    }

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendUpdates: 'all', // Send invitations to attendees
    })

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      calendarId: calendarId,
      message: 'Calendar event created successfully'
    })

  } catch (error: unknown) {
    console.error('Error creating calendar event:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create calendar event'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'Unable to create calendar event. Please check the booking data and try again.'
      },
      { status: 500 }
    )
  }
}

