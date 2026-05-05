import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.error('sms/webhook: missing Supabase URL or key')
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the request body as form data (Twilio sends form-urlencoded)
    const formData = await request.formData()
    
    // Extract Twilio parameters
    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const status = formData.get('SmsStatus') as string

    console.log('Received SMS webhook:', { messageSid, from, to, body, status })

    // Optional: Validate webhook signature (use process.env.TWILIO_AUTH_TOKEN with twilio.validateRequest)
    // const twilioSignature = request.headers.get('x-twilio-signature') || ''
    // const url = request.url
    // const params = Object.fromEntries(formData.entries())
    // const isValid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, twilioSignature, url, params)
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    // }

    // Normalize phone number for matching
    const normalizePhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 11 && digits.startsWith('1')) {
        return digits.substring(1)
      }
      return digits.length === 10 ? digits : phone
    }

    const normalizedFrom = normalizePhone(from)

    // Try to find the lead associated with this phone number
    let leadName = null
    let leadId = null
    let leadTable = null

    // Search in fj_leads with normalized phone
    const { data: fjLeads } = await supabase
      .from('fj_leads')
      .select('id, firstname, lastname, phone, project_name, source')

    const fjLead = fjLeads?.find(lead => 
      normalizePhone(lead.phone || '') === normalizedFrom
    )

    if (fjLead) {
      leadName = `${fjLead.firstname} ${fjLead.lastname}`
      leadId = fjLead.id
      leadTable = 'fj_leads'
    } else {
      // Search in precon_factory_leads with normalized phone
      const { data: preconLeads } = await supabase
        .from('precon_factory_leads')
        .select('id, firstname, lastname, phone, project_name, source')

      const preconLead = preconLeads?.find(lead => 
        normalizePhone(lead.phone || '') === normalizedFrom
      )

      if (preconLead) {
        leadName = `${preconLead.firstname} ${preconLead.lastname}`
        leadId = preconLead.id
        leadTable = 'precon_factory_leads'
      }
    }

    // Save incoming message to database
    const { error: dbError } = await supabase
      .from('sms_conversations')
      .insert({
        message_sid: messageSid,
        from_phone: from,
        to_phone: to,
        message_body: body,
        direction: 'inbound',
        status: status,
        lead_name: leadName,
        lead_id: leadId,
        lead_table: leadTable
      })

    if (dbError) {
      console.error('Error saving incoming SMS:', dbError)
      // Still return 200 to Twilio so it doesn't retry
    }

    // Respond to Twilio with TwiML (empty response = no auto-reply)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })

  } catch (error: unknown) {
    console.error('Error processing SMS webhook:', error)
    
    // Return 200 to prevent Twilio from retrying
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}

// Also handle GET for webhook testing
export async function GET() {
  return NextResponse.json({ 
    message: 'SMS webhook endpoint is active',
    webhookUrl: 'POST to this endpoint from Twilio'
  })
}

