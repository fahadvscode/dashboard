import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

export async function POST(request: NextRequest) {
  try {
    const { leadId, email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Download PDF from Supabase Storage
    const { data: pdfData, error: storageError } = await supabase
      .storage
      .from('rental-documents')
      .download('rental-application.pdf')
    
    if (storageError || !pdfData) {
      console.error('PDF not found in Supabase Storage:', storageError)
      return NextResponse.json(
        { error: 'Rental application PDF not found in storage. Please upload it to Supabase Storage bucket "rental-documents".' },
        { status: 500 }
      )
    }

    // Convert blob to buffer for nodemailer
    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())

    // Professional email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .logo-header { width: 100%; background-color: #024225; padding: 0; margin: 0; }
          .logo-img { width: 100%; height: auto; display: block; }
          .header { background-color: #024225; color: white; padding: 30px; text-align: center; }
          .content { background-color: #ffffff; padding: 30px; }
          .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #024225; }
          .button { display: inline-block; background-color: #024225; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .contact-info { background-color: #e8f5f1; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #024225; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background-color: #f8f9fa; }
          h3 { color: #024225; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-header">
            <img src="https://cfzuypbljirmibmxpabi.supabase.co/storage/v1/object/public/email-images/fj%20logo.png" alt="Fahad Javed Real Estate" class="logo-img" />
          </div>
          <div class="header">
            <h1 style="margin: 0;">🏠 Rental Application</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Fahad Javed Real Estate</p>
          </div>
          
          <div class="content">
            <p>Dear ${name},</p>
            
            <p>Thank you for your interest in renting with us! We're excited to help you find your perfect home.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #024225;">📄 Next Steps:</h3>
              <ol style="line-height: 1.8;">
                <li><strong>Download the attached Rental Application</strong> (OREA Form 410)</li>
                <li><strong>Fill out all sections completely</strong> - incomplete applications may delay processing</li>
                <li><strong>Include all required information:</strong>
                  <ul style="margin-top: 10px;">
                    <li>Personal information and date of birth</li>
                    <li>Current and previous addresses</li>
                    <li>Employment history</li>
                    <li>References and banking information</li>
                  </ul>
                </li>
                <li><strong>Return the completed application</strong> to us via email or in person</li>
              </ol>
            </div>

            <p><strong>⚠️ Important Information:</strong></p>
            <ul>
              <li>This is the official <strong>OREA (Ontario Real Estate Association)</strong> Rental Application Form 410</li>
              <li>All information provided will be kept strictly confidential</li>
              <li>We may conduct a credit check and contact your references as part of the application process</li>
              <li>Processing typically takes 24-48 hours once we receive your completed application</li>
            </ul>

            <div class="contact-info">
              <h3 style="margin-top: 0; color: #024225;">📞 Need Help or Have Questions?</h3>
              <p style="margin: 10px 0;"><strong>Fahad Javed Real Estate</strong></p>
              <p style="margin: 5px 0;">📧 Email: <a href="mailto:info@fahadsold.com" style="color: #024225; text-decoration: none; font-weight: bold;">info@fahadsold.com</a></p>
              <p style="margin: 5px 0;">📱 Phone: <a href="tel:6478981739" style="color: #024225; text-decoration: none; font-weight: bold;">647.898.1739</a></p>
              <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">We're here to assist you Monday through Friday, 9 AM - 6 PM EST</p>
            </div>

            <p>We look forward to reviewing your application and helping you secure your new home!</p>
            
            <p><strong>Best regards,</strong><br>
            Fahad Javed<br>
            <em>Fahad Javed Real Estate</em></p>
          </div>
          
          <div class="footer">
            <p>This email was sent from Fahad Javed Real Estate</p>
            <p>📧 info@fahadsold.com | 📱 647.898.1739</p>
            <p>© ${new Date().getFullYear()} Fahad Javed Real Estate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email with PDF attachment
    const result = await emailTransporter.sendMail({
      from: '"Fahad Javed Real Estate" <info@fahadsold.com>',
      to: email,
      subject: '🏠 Your Rental Application - Fahad Javed Real Estate',
      html: emailHtml,
      attachments: [
        {
          filename: 'Rental_Application_OREA_Form_410.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    })

    console.log(`✅ Rental application sent to ${email} (Lead ID: ${leadId})`)

    // Update database to track application sent
    try {
      // Get current application history
      const { data: currentLead } = await supabase
        .from('rental_leads')
        .select('application_history, application_sent_count')
        .eq('id', leadId)
        .single()

      const currentHistory = currentLead?.application_history || []
      const currentCount = currentLead?.application_sent_count || 0

      // Add new entry to history
      const newHistoryEntry = {
        sent_at: new Date().toISOString(),
        sent_to: email,
        sent_by: 'Dashboard'
      }

      const updatedHistory = [...currentHistory, newHistoryEntry]

      // Update the lead record
      await supabase
        .from('rental_leads')
        .update({
          application_sent: true,
          application_sent_at: new Date().toISOString(),
          application_sent_count: currentCount + 1,
          application_history: updatedHistory
        })
        .eq('id', leadId)

      console.log(`📊 Updated tracking for lead ${leadId}: count=${currentCount + 1}`)
    } catch (dbError) {
      console.error('Error updating tracking:', dbError)
      // Don't fail the whole request if tracking update fails
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Rental application sent successfully'
    })

  } catch (error) {
    console.error('Error sending rental application:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send rental application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

