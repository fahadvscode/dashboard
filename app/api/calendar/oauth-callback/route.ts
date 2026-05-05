import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Unified Qikfill OAuth credentials for info@qikfill.com Google Workspace
const QIKFILL_CLIENT_ID = process.env.QIKFILL_GOOGLE_CLIENT_ID!
const QIKFILL_CLIENT_SECRET = process.env.QIKFILL_GOOGLE_CLIENT_SECRET!

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://property-dashboard-three.vercel.app/api/calendar/oauth-callback'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { google } = await import('googleapis')
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') || 'qikfill'
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.json(
        { error: `Authorization failed: ${error}` },
        { status: 400 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      )
    }

    // Unified OAuth client for all calendars
    const oauth2Client = new google.auth.OAuth2(
      QIKFILL_CLIENT_ID,
      QIKFILL_CLIENT_SECRET,
      REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token received. Please revoke access and try again with consent screen.' },
        { status: 400 }
      )
    }

    // Store unified tokens in Supabase
    const { error: dbError } = await supabase
      .from('calendar_tokens')
      .upsert({
        calendar_type: 'qikfill',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'calendar_type'
      })

    if (dbError) {
      console.error('Error storing tokens:', dbError)
      return NextResponse.json(
        { 
          error: 'Failed to store tokens',
          details: dbError.message,
          tokens: tokens // Return tokens so user can manually store them
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Qikfill calendar authorization successful! All calendars (FJ, Precon Factory, GTA Lowrise) are now connected.',
      calendarType: 'qikfill',
      calendarsEnabled: ['FJ', 'Precon Factory', 'GTA Lowrise'],
      expiresIn: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
    })

  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return NextResponse.json(
      { 
        error: 'Authorization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

