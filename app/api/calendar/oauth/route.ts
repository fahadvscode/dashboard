import { NextRequest, NextResponse } from 'next/server'

// Unified Qikfill OAuth credentials for info@qikfill.com Google Workspace
const QIKFILL_CLIENT_ID = process.env.QIKFILL_GOOGLE_CLIENT_ID!
const QIKFILL_CLIENT_SECRET = process.env.QIKFILL_GOOGLE_CLIENT_SECRET!

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://property-dashboard-three.vercel.app/api/calendar/oauth-callback'

export async function GET(request: NextRequest) {
  try {
    const { google } = await import('googleapis')
    // Unified OAuth for all calendars under info@qikfill.com
    const oauth2Client = new google.auth.OAuth2(
      QIKFILL_CLIENT_ID,
      QIKFILL_CLIENT_SECRET,
      REDIRECT_URI
    )

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: 'qikfill' // Single unified state
    })

    // Redirect directly to Google OAuth page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error generating OAuth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

