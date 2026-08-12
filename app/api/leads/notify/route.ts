import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { resolveCustomerNotes } from '@/lib/customerNotes'
import { formatLeadSheetTimestamp } from '@/lib/leadGoogleSheets'
import {
  resolvePreconFactoryWebsiteInterested,
  resolvePreconFactoryWebsiteLandingPage,
  resolvePreconFactoryWebsiteSheetTag,
} from '@/lib/preconFactoryWebsiteSheet'
import {
  appendLandingLeadDetailLines,
  formatBrokerYesNo,
  getBrokerFieldForLead,
  getLandingPageSourceMap,
  normalizeLandingPageTableName,
  resolveInterestedFromLead,
  resolveLandingPageLink,
  resolveLandingProjectName,
  sourceToSheetMeta,
  type LandingPageSheetMeta,
  type LandingPageSource,
} from '@/lib/landingPageSources'

const notificationEmails = ['fahad@fahadsold.com', 'info@preconfactory.com']
const rentalOnlyEmails = ['harjit@hminhas.ca']
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

function resolveLeadTableName(
  lead: Record<string, unknown>,
  sourceMap: Map<string, LandingPageSource>
): string | undefined {
  for (const key of ['table_name', 'tableName', 'table'] as const) {
    const resolved = normalizeLandingPageTableName(lead[key])
    if (resolved) return resolved
  }

  const hint = [lead.source, lead.project_name, lead.website_name, lead.website, lead.source_page]
    .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
    .join(' ')

  for (const source of sourceMap.values()) {
    const name = source.display_name.toLowerCase()
    const table = source.table_name.toLowerCase()
    if (hint.includes(table.replace(/_/g, ' ')) || hint.includes(table.replace(/_/g, '-'))) {
      return source.table_name
    }
    if (name.length > 3 && hint.includes(name)) {
      return source.table_name
    }
  }

  if (
    hint.includes('precon factory website') ||
    hint.includes('preconfactory') ||
    hint.includes('project-unlock')
  ) {
    return 'precon_factory_website_leads'
  }

  return undefined
}

function isEmailLeadTable(tableName: unknown): boolean {
  return (
    tableName === 'fj_leads' ||
    tableName === 'precon_factory_leads' ||
    tableName === 'precon_factory_website_leads' ||
    tableName === 'gta_lowrise_leads'
  )
}

function formatIsAgentBrokerSheetValue(lead: Record<string, unknown>): 'Yes' | 'No' {
  return lead.isagent ? 'Yes' : 'No'
}

function resolveEmailLeadSheetTag(lead: Record<string, unknown>): string {
  return lead.isagent ? 'realtor' : ''
}

function formatBrokerSheetValue(lead: Record<string, unknown>): string {
  return formatBrokerYesNo(getBrokerFieldForLead(lead))
}

function resolveLandingPageSheetTag(lead: Record<string, unknown>): string {
  const broker = formatBrokerSheetValue(lead)
  if (broker === 'Yes') return 'Landing Page, realtor'
  return 'Landing Page'
}

function resolveLeadSourceName(
  tableName: unknown,
  sourceMap: Map<string, LandingPageSource>
): string {
  const normalized = normalizeLandingPageTableName(tableName)
  if (normalized && sourceMap.has(normalized)) {
    return sourceMap.get(normalized)!.display_name
  }

  switch (normalized) {
    case 'fj_leads':
      return 'FJ'
    case 'precon_factory_leads':
      return 'Precon Factory'
    case 'precon_factory_website_leads':
      return 'Precon Factory Website'
    case 'gta_lowrise_leads':
      return 'GTA Lowrise'
    case 'rental_leads':
      return 'Rental'
    default:
      return 'Unknown'
  }
}

async function appendLeadToGoogleSheet(
  lead: Record<string, unknown>,
  landingMeta: LandingPageSheetMeta | null
) {
  try {
    const { google } = await import('googleapis')
    let privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    if (!privateKey.startsWith('-----BEGIN')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const firstName = (lead.firstname as string) || (lead.first_name as string) ||
      ((lead.full_name as string) || '').split(' ')[0] || 'N/A'
    const lastName = (lead.lastname as string) || (lead.last_name as string) ||
      ((lead.full_name as string) || '').split(' ').slice(1).join(' ') || 'N/A'

    const timestamp = formatLeadSheetTimestamp(lead.created_at)

    let projectName = (lead.project_name as string) || (lead.source as string) || 'N/A'
    let projectId = (lead.project_id as string) || 'N/A'
    let landingPage = (lead.redirect_link as string) || 'N/A'
    let company =
      lead.table_name === 'fj_leads' ? 'Fahad Javed Dashboard' :
      lead.table_name === 'precon_factory_leads' ? 'Precon Factory Dashboard' :
      lead.table_name === 'precon_factory_website_leads' ? 'Precon Factory Website' :
      lead.table_name === 'gta_lowrise_leads' ? 'GTA Lowrise' :
      lead.table_name === 'rental_leads' ? 'Rental' :
      'Unknown'
    let tag = ''
    let broker = 'N/A'
    let interested = 'N/A'

    if (landingMeta) {
      tag = resolveLandingPageSheetTag(lead)
      broker = formatBrokerSheetValue(lead)
      interested = resolveInterestedFromLead(lead)
      projectId = 'N/A'
      projectName = resolveLandingProjectName(lead, landingMeta)
      landingPage = resolveLandingPageLink(lead, landingMeta)
      company = `Landing Page - ${landingMeta.pageName}`
    } else if (isEmailLeadTable(lead.table_name)) {
      broker = formatIsAgentBrokerSheetValue(lead)
      if (lead.table_name === 'precon_factory_website_leads') {
        tag = resolvePreconFactoryWebsiteSheetTag(lead)
        interested = resolvePreconFactoryWebsiteInterested(lead)
        landingPage = resolvePreconFactoryWebsiteLandingPage(lead)
      } else {
        tag = resolveEmailLeadSheetTag(lead)
      }
    }

    const sheetMessage =
      isEmailLeadTable(lead.table_name) || landingMeta
        ? resolveCustomerNotes(lead)
        : ''

    const row = [
      firstName,
      lastName,
      (lead.email as string) || 'N/A',
      (lead.phone as string) || 'N/A',
      projectName,
      projectId,
      landingPage,
      company,
      timestamp,
      tag,
      broker,
      interested,
      sheetMessage,
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    })

    console.log('Lead appended to Google Sheet successfully:', {
      firstName,
      lastName,
      projectName,
      company,
      tag,
      broker,
      interested,
    })
  } catch (error) {
    console.error('Error appending lead to Google Sheet:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const lead = await request.json()
    const sourceMap = await getLandingPageSourceMap({ enabledOnly: true })

    const resolvedTableName = resolveLeadTableName(lead, sourceMap)
    if (resolvedTableName) {
      lead.table_name = resolvedTableName
    }

    // Log the received payload for debugging
    console.log('===========================================')
    console.log('Received Lead Notification Payload:')
    console.log('Table Name:', lead.table_name)
    console.log('Project Name:', lead.project_name)
    console.log('Project ID:', lead.project_id)
    console.log('Redirect Link:', lead.redirect_link)
    console.log('Full Payload:', JSON.stringify(lead, null, 2))
    console.log('===========================================')

    // Validate required fields (handle firstname, first_name, and full_name)
    if ((!lead.firstname && !lead.first_name && !lead.full_name) || !lead.email) {
      return NextResponse.json(
        { error: 'Missing required lead data' },
        { status: 400 }
      )
    }

    const tableKey = normalizeLandingPageTableName(lead.table_name) || String(lead.table_name || '')
    const landingSource = tableKey ? sourceMap.get(tableKey) : undefined
    const landingMeta = landingSource ? sourceToSheetMeta(landingSource) : null

    // Determine source
    const source = resolveLeadSourceName(lead.table_name, sourceMap)
    
    const isRentalLead = lead.table_name === 'rental_leads'
    const isPreconFactoryWebsiteLead = lead.table_name === 'precon_factory_website_leads'
    const isLandingPageLead = Boolean(landingMeta)
    const landingPageName = landingMeta?.websiteName || ''
    const leadType = isRentalLead ? 'Rental Inquiry' : (lead.isagent ? 'Agent' : 'Buyer')
    const customerNotes = isEmailLeadTable(lead.table_name) ? resolveCustomerNotes(lead) : ''
    
    const leadPath =
      lead.table_name === 'fj_leads' ? 'fj-leads' :
      lead.table_name === 'precon_factory_leads' ? 'precon-leads' :
      lead.table_name === 'precon_factory_website_leads' ? 'precon-factory-website-leads' :
      lead.table_name === 'gta_lowrise_leads' ? 'gta-lowrise-leads' :
      lead.table_name === 'rental_leads' ? 'rental-leads' :
      isLandingPageLead ? 'landing-pages-leads' :
      'rental-leads'
    
    const dashboardUrl = `https://property-dashboard-three.vercel.app/${leadPath}?leadId=${lead.id}`
    
    // Get display name (handle firstname/lastname, first_name/last_name, and full_name)
    const firstName = lead.firstname || lead.first_name || ''
    const lastName = lead.lastname || lead.last_name || ''
    const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (lead.full_name || 'Name not provided')
    
    // Format the notification message
    let message = ''
    
    if (isRentalLead) {
      // Rental lead format
      message = `🏠 New Rental Lead!

👤 ${displayName}
📧 ${lead.email}
📱 ${lead.phone || 'No phone'}
📍 ${lead.neighbourhood || 'Not specified'}
🏘️ ${lead.property_type || 'Any type'}
🛏️ ${lead.bedrooms || 'Any'} bedrooms
💰 Budget: $${lead.budget ? lead.budget.toLocaleString() : 'Not specified'}
📅 Move-in: ${lead.move_in_date || 'Flexible'}`

      // Add features if available
      if (lead.features && Array.isArray(lead.features) && lead.features.length > 0) {
        message += `\n✨ Features: ${lead.features.join(', ')}`
      }

      // Add pets info
      if (lead.has_pets) {
        message += `\n🐾 Has pets${lead.pet_details ? `: ${lead.pet_details}` : ''}`
      }

      // Add occupants if specified
      if (lead.occupants) {
        message += `\n👥 Occupants: ${lead.occupants}`
      }

      // Add credit score if available
      if (lead.credit_score) {
        message += `\n💳 Credit: ${lead.credit_score}`
      }

      // Add notes if available
      if (lead.notes) {
        message += `\n📝 Notes: ${lead.notes}`
      }
    } else if (isLandingPageLead) {
      const detailLines: string[] = []
      appendLandingLeadDetailLines(lead, detailLines)
      message = `📄 New Landing Page Lead! (${landingPageName})

👤 ${displayName}
📧 ${lead.email}
📱 ${lead.phone || 'No phone'}
📋 Landing Page: ${landingPageName}`
      if (detailLines.length) {
        message += '\n' + detailLines.join('\n')
      }
    } else {
      // Regular lead format
      message = `🔔 New ${source} Lead!

👤 ${displayName}
📧 ${lead.email}
📱 ${lead.phone || 'No phone'}
🏢 Project: ${lead.project_name || lead.source || 'Not specified'}`
    
    // Add project ID if available
    if (lead.project_id) {
      message += `\n🆔 Project ID: ${lead.project_id}`
    }
    
    // Add landing page if available
    if (lead.redirect_link) {
      message += `\n🌐 Landing Page: ${lead.redirect_link}`
    } else if (isPreconFactoryWebsiteLead) {
      message += `\n🌐 Website: ${resolvePreconFactoryWebsiteLandingPage(lead)}`
    }

    if (isPreconFactoryWebsiteLead) {
      if (lead.interested_in) message += `\n🎯 Interested in: ${lead.interested_in}`
      if (lead.budget) message += `\n💰 Budget: ${lead.budget}`
      if (lead.timeline) message += `\n📅 Timeline: ${lead.timeline}`
      if (lead.source) message += `\n📌 Source: ${lead.source}`
    }

    if (customerNotes) {
      message += `\n💬 Message: ${customerNotes}`
    }
    
      message += `\n🎯 Type: ${leadType}`
    }
    
    message += `\n⏰ Just now

👉 View in Dashboard: ${dashboardUrl}`

    // Determine which emails to notify based on lead type
    const emailsToNotify = isRentalLead
      ? [...notificationEmails, ...rentalOnlyEmails]
      : notificationEmails

    // Send email notifications
    const emailResponses: { email: string; messageId?: string; error?: string }[] = []
    try {
      // Build email data rows based on lead type
      let emailDataRows = ''
      
      if (isRentalLead) {
        // Rental lead email data
        emailDataRows = `
          <div class="data-row">
            <div class="data-label">Name</div>
            <div class="data-value">${displayName}</div>
          </div>
          <div class="data-row">
            <div class="data-label">Email</div>
            <div class="data-value"><a href="mailto:${lead.email}" style="color: #2563eb; text-decoration: none;">${lead.email}</a></div>
          </div>
          <div class="data-row">
            <div class="data-label">Phone</div>
            <div class="data-value"><a href="tel:${lead.phone}" style="color: #111827; text-decoration: none;">${lead.phone || 'Not provided'}</a></div>
          </div>
          <div class="data-row">
            <div class="data-label">Neighbourhood</div>
            <div class="data-value">${lead.neighbourhood || 'Not specified'}</div>
          </div>
          <div class="data-row">
            <div class="data-label">Property Type</div>
            <div class="data-value">${lead.property_type || 'Any type'}</div>
          </div>
          <div class="data-row">
            <div class="data-label">Bedrooms</div>
            <div class="data-value">${lead.bedrooms || 'Any'}</div>
          </div>
          <div class="data-row">
            <div class="data-label">Budget</div>
            <div class="data-value">$${lead.budget ? lead.budget.toLocaleString() : 'Not specified'}/month</div>
          </div>
          <div class="data-row">
            <div class="data-label">Move-in Date</div>
            <div class="data-value">${lead.move_in_date || 'Flexible'}</div>
          </div>
          ${lead.features && Array.isArray(lead.features) && lead.features.length > 0 ? `
          <div class="data-row">
            <div class="data-label">Features</div>
            <div class="data-value">${lead.features.join(', ')}</div>
          </div>` : ''}
          ${lead.occupants ? `
          <div class="data-row">
            <div class="data-label">Occupants</div>
            <div class="data-value">${lead.occupants}</div>
          </div>` : ''}
          ${lead.credit_score ? `
          <div class="data-row">
            <div class="data-label">Credit Score</div>
            <div class="data-value">${lead.credit_score}</div>
          </div>` : ''}
          ${lead.has_pets ? `
          <div class="data-row">
            <div class="data-label">Pets</div>
            <div class="data-value">Yes${lead.pet_details ? ` - ${lead.pet_details}` : ''}</div>
          </div>` : ''}
          ${lead.notes ? `
          <div class="data-row">
            <div class="data-label">Notes</div>
            <div class="data-value">${lead.notes}</div>
          </div>` : ''}
          <div class="data-row">
            <div class="data-label">Timestamp</div>
            <div class="data-value">${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>
        `
      } else {
        // Regular lead email data
        emailDataRows = `
          <div class="data-row">
            <div class="data-label">Name</div>
            <div class="data-value">${displayName}</div>
          </div>
          <div class="data-row">
            <div class="data-label">Email</div>
            <div class="data-value"><a href="mailto:${lead.email}" style="color: #2563eb; text-decoration: none;">${lead.email}</a></div>
          </div>
          <div class="data-row">
            <div class="data-label">Phone</div>
            <div class="data-value"><a href="tel:${lead.phone}" style="color: #111827; text-decoration: none;">${lead.phone || 'Not provided'}</a></div>
          </div>
          <div class="data-row">
            <div class="data-label">Project</div>
            <div class="data-value">${lead.project_name || lead.source || 'Not specified'}</div>
          </div>
          ${lead.project_id ? `
          <div class="data-row">
            <div class="data-label">Project ID</div>
            <div class="data-value">${lead.project_id}</div>
          </div>` : ''}
          ${lead.redirect_link ? `
          <div class="data-row">
            <div class="data-label">Source URL</div>
            <div class="data-value"><a href="${lead.redirect_link}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${lead.redirect_link}</a></div>
          </div>` : ''}
          ${isPreconFactoryWebsiteLead && !lead.redirect_link ? `
          <div class="data-row">
            <div class="data-label">Website</div>
            <div class="data-value"><a href="${resolvePreconFactoryWebsiteLandingPage(lead)}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${resolvePreconFactoryWebsiteLandingPage(lead)}</a></div>
          </div>` : ''}
          ${isPreconFactoryWebsiteLead && lead.interested_in ? `
          <div class="data-row">
            <div class="data-label">Interested in</div>
            <div class="data-value">${lead.interested_in}</div>
          </div>` : ''}
          ${isPreconFactoryWebsiteLead && lead.budget ? `
          <div class="data-row">
            <div class="data-label">Budget</div>
            <div class="data-value">${lead.budget}</div>
          </div>` : ''}
          ${isPreconFactoryWebsiteLead && lead.timeline ? `
          <div class="data-row">
            <div class="data-label">Timeline</div>
            <div class="data-value">${lead.timeline}</div>
          </div>` : ''}
          ${isPreconFactoryWebsiteLead && lead.source ? `
          <div class="data-row">
            <div class="data-label">Source</div>
            <div class="data-value">${lead.source}</div>
          </div>` : ''}
          ${customerNotes ? `
          <div class="data-row">
            <div class="data-label">Message</div>
            <div class="data-value">${customerNotes}</div>
          </div>` : ''}
          <div class="data-row">
            <div class="data-label">Type</div>
            <div class="data-value">${leadType}</div>
          </div>
          <div class="data-row">
            <div class="data-label">Timestamp</div>
            <div class="data-value">${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>
        `
      }
      
      // Create HTML email body
      const htmlEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Reset and Base Styles */
            body, p, h1, h2, div { margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; line-height: 1.5; color: #1f2937; background-color: #f3f4f6; -webkit-font-smoothing: antialiased; }
            
            /* Layout */
            .wrapper { width: 100%; background-color: #f3f4f6; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; }
            
            /* Header */
            .header { padding: 32px 40px; border-bottom: 1px solid #e5e7eb; background-color: #ffffff; }
            .logo { font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.5px; text-decoration: none; }
            .logo span { color: #2563eb; }
            
            /* Content */
            .content { padding: 40px; }
            .title-block { margin-bottom: 32px; text-align: center; }
            .badge { display: inline-block; padding: 4px 12px; background-color: #eff6ff; color: #2563eb; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
            .title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 8px; }
            .subtitle { font-size: 16px; color: #6b7280; }
            
            /* Data Grid */
            .data-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 32px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
            .data-row { display: table-row; }
            .data-label { display: table-cell; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; width: 140px; font-size: 14px; font-weight: 600; color: #6b7280; vertical-align: top; }
            .data-value { display: table-cell; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 500; color: #111827; }
            .data-row:last-child .data-label, .data-row:last-child .data-value { border-bottom: none; }
            
            /* Button */
            .action-block { text-align: center; margin-top: 32px; }
            .button { display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; text-decoration: none; transition: background-color 0.2s; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
            
            /* Footer */
            .footer { background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { font-size: 13px; color: #9ca3af; margin-bottom: 8px; }
            .footer-link { color: #6b7280; text-decoration: underline; }
            
            /* Responsive */
            @media only screen and (max-width: 600px) {
              .wrapper { padding: 20px 0; }
              .header, .content, .footer { padding: 24px; }
              .data-label { width: 100px; padding: 12px 16px; }
              .data-value { padding: 12px 16px; }
              .title { font-size: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <!-- Header -->
              <div class="header">
                <div class="logo">Qik<span>fill</span></div>
              </div>
              
              <!-- Content -->
              <div class="content">
                <div class="title-block">
                  <span class="badge">New Lead Notification</span>
                  <h1 class="title">${source} Lead Received</h1>
                  <p class="subtitle">${isRentalLead ? 'A new rental inquiry has been submitted.' : 'A new potential client has submitted their details.'}</p>
                </div>
                
                <div class="data-grid">
                  ${emailDataRows}
                </div>
                
                <div class="action-block">
                  <a href="${dashboardUrl}" class="button">View Lead in Dashboard</a>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <p class="footer-text">This is an automated notification from Qikfill Systems.</p>
                <p class="footer-text">© ${new Date().getFullYear()} Qikfill. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

      for (const email of emailsToNotify) {
        try {
          const result = await emailTransporter.sendMail({
            from: `"Qikfill" <${process.env.GMAIL_USER || 'info@qikfill.com'}>`,
            to: email,
            subject: `New ${source} Lead: ${displayName}`,
            text: message,
            html: htmlEmail
          })
          emailResponses.push({ email, messageId: result.messageId })
        } catch (perEmailErr) {
          const msg = perEmailErr instanceof Error ? perEmailErr.message : String(perEmailErr)
          console.error('Error sending lead email to', email, perEmailErr)
          emailResponses.push({ email, error: msg })
        }
      }
      console.log('Lead admin emails sent:', emailResponses)
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError)
    }

    // Append lead to Google Sheet (non-blocking, won't break existing flow)
    try {
      await appendLeadToGoogleSheet(lead, landingMeta)
    } catch (sheetError) {
      console.error('Google Sheets error (non-critical):', sheetError)
    }

    console.log('Lead notifications sent:', {
      leadId: lead.id,
      source: source,
      adminSms: 'disabled',
      adminEmails: emailResponses,
    })

    return NextResponse.json({
      success: true,
      adminSms: [],
      adminSmsDisabled: true,
      adminEmails: emailResponses,
      emailRecipients: emailsToNotify,
      emailsSent: emailResponses.filter(e => e.messageId).length,
      googleSheetUpdated: true,
      lead: displayName,
      source: source,
      leadType: leadType
    })

  } catch (error) {
    console.error('Error sending lead notification:', error)
    
    // Don't fail the lead insertion if notification fails
    return NextResponse.json(
      { 
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

