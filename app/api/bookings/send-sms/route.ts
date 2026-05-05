import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.error('bookings/send-sms: missing Supabase URL or key')
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      console.error('bookings/send-sms: missing Twilio env vars')
      return NextResponse.json(
        { error: 'SMS service is not configured.' },
        { status: 503 }
      )
    }
    const client = twilio(accountSid, authToken)

    const body = await request.json()
    const { to, message, bookingName, bookingId, bookingTable } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Send SMS via Twilio
    const smsResponse = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to
    })

    // Log the outgoing message to database
    try {
      const { error: dbError } = await supabase
        .from('sms_conversations')
        .insert({
          message_sid: smsResponse.sid,
          from_phone: twilioPhoneNumber,
          to_phone: to,
          message_body: message,
          direction: 'outbound',
          status: smsResponse.status,
          lead_name: bookingName, // Reuse lead_name column for booking name
          lead_id: bookingId, // Reuse lead_id column for booking id
          lead_table: bookingTable // Reuse lead_table column for booking table
        })

      if (dbError) {
        console.error('Error logging SMS to database:', dbError)
        // Don't fail the request if logging fails
      }
    } catch (logError) {
      console.error('Error logging SMS:', logError)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      messageSid: smsResponse.sid,
      status: smsResponse.status,
      to: smsResponse.to,
      message: 'SMS sent successfully'
    })

  } catch (error: unknown) {
    console.error('Error sending SMS:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'Unable to send SMS. Please check the phone number and try again.'
      },
      { status: 500 }
    )
  }
}

