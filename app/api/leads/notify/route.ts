import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import nodemailer from 'nodemailer'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhone = process.env.TWILIO_PHONE_NUMBER
const notificationPhones = ['6478981739', '4168296121', '4163994289'] // SMS recipients for all leads
const rentalOnlyPhones = ['4168395020'] // SMS recipients for rental leads only
const notificationEmails = ['fahad@fahadsold.com', 'info@preconfactory.com'] // Email recipients for all leads
const rentalOnlyEmails = ['harjit@hminhas.ca'] // Email recipients for rental leads only

/** Twilio expects E.164 (e.g. +16478981739). */
function toE164NorthAmerica(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.startsWith('+') ? phone : `+${digits}`
}

const client = twilio(accountSid, authToken)

// Gmail SMTP configuration for info@qikfill.com
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@qikfill.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

const LANDING_PAGE_SHEET_META: Record<string, { websiteName: string; pageName: string; siteUrl: string }> = {
  cornerstone_leads: {
    websiteName: 'Cornerstone',
    pageName: 'Cornerstone',
    siteUrl: 'https://www.newcornerstonehomes.ca',
  },
  novella_leads: {
    websiteName: 'Novella',
    pageName: 'Novella',
    siteUrl: 'https://www.newnovellahomes.ca',
  },
  lakeview_village_leads: {
    websiteName: 'Lakeview Village',
    pageName: 'Lakeview Village',
    siteUrl: 'https://lakeviewvillagetownhome.ca',
  },
  rollingwood_leads: {
    websiteName: 'Rollingwood',
    pageName: 'Rollingwood',
    siteUrl: 'https://www.rollingwoodtowns.ca',
  },
  enclave: {
    websiteName: 'Enclave',
    pageName: 'Enclave',
    siteUrl: 'https://enclave1.vercel.app',
  },
  hawthorne_east_village: {
    websiteName: 'Hawthorne East Village',
    pageName: 'Hawthorne East Village',
    siteUrl: 'https://hawthorneeast-village.com',
  },
  bronte_trails: {
    websiteName: 'Bronte Trails',
    pageName: 'Bronte Trails',
    siteUrl: 'https://www.brontetrails.ca',
  },
  spruce_trails: {
    websiteName: 'Spruce Trails',
    pageName: 'Spruce Trails',
    siteUrl: 'https://sprucetrails.ca',
  },
  meadowvale_brooks: {
    websiteName: 'Meadowvale Brooks',
    pageName: 'Meadowvale Brooks',
    siteUrl: 'https://meadowvalebrooks.ca',
  },
  the_legacy: {
    websiteName: 'The Legacy',
    pageName: 'The Legacy',
    siteUrl: 'https://thelegacyburlington.ca',
  },
}

function isLandingPageLeadTable(tableName: unknown): tableName is keyof typeof LANDING_PAGE_SHEET_META {
  return typeof tableName === 'string' && tableName in LANDING_PAGE_SHEET_META
}

/** Build a full https URL for the Google Sheet "Landing Page" column. */
function resolveLandingPageLink(
  lead: Record<string, unknown>,
  meta: { siteUrl: string }
): string {
  const redirect = String(lead.redirect_link ?? '').trim()
  if (redirect) {
    if (/^https?:\/\//i.test(redirect)) return redirect
    if (redirect.includes('.')) return `https://${redirect.replace(/^\/\//, '')}`
  }

  const source = String(lead.source ?? '').trim()
  const pagePathRaw = String(lead.page_path ?? lead.source_page ?? '/').trim() || '/'
  const pagePath = pagePathRaw.startsWith('/') ? pagePathRaw : `/${pagePathRaw}`

  // Domain in source (e.g. www.brontetrails.ca) + optional path
  if (source.includes('.')) {
    const host = source.replace(/^https?:\/\//i, '').replace(/\/$/, '')
    return `https://${host}${pagePath === '/' ? '/' : pagePath}`
  }

  if (/^https?:\/\//i.test(meta.siteUrl)) {
    try {
      return new URL(pagePath, meta.siteUrl).href
    } catch {
      return meta.siteUrl
    }
  }

  return meta.siteUrl
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

function getBrokerFieldForLead(lead: Record<string, unknown>): unknown {
  const table = lead.table_name
  if (
    table === 'hawthorne_east_village' ||
    table === 'bronte_trails' ||
    table === 'spruce_trails'
  ) {
    return lead.is_broker
  }
  if (table === 'cornerstone_leads') {
    if (lead.is_broker !== undefined && lead.is_broker !== null) return lead.is_broker
    return lead.is_realtor
  }
  if (table === 'rollingwood_leads') return lead.is_realtor
  if (table === 'meadowvale_brooks' || table === 'the_legacy') return lead.realtor
  return null
}

function formatBrokerSheetValue(lead: Record<string, unknown>): string {
  if (!isLandingPageLeadTable(lead.table_name)) return 'N/A'

  const raw = getBrokerFieldForLead(lead)

  if (raw === null || raw === undefined) return 'N/A'

  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'

  const value = String(raw).trim()
  if (!value) return 'N/A'
  const lower = value.toLowerCase()
  if (lower === 'true' || lower === 'yes' || lower === 'y' || lower === '1') return 'Yes'
  if (lower === 'false' || lower === 'no' || lower === 'n' || lower === '0') return 'No'
  return value
}

function resolveLandingPageSheetTag(lead: Record<string, unknown>): string {
  const broker = formatBrokerSheetValue(lead)
  if (broker === 'Yes') return 'Landing Page, realtor'
  return 'Landing Page'
}

function resolveInterestedSheetValue(lead: Record<string, unknown>): string {
  if (!isLandingPageLeadTable(lead.table_name)) return 'N/A'

  switch (lead.table_name) {
    case 'enclave':
      return (lead.model as string) || 'N/A'
    case 'bronte_trails':
      return (lead.project_tag as string) || 'N/A'
    case 'spruce_trails':
      return (lead.interest as string) || (lead.project_tag as string) || 'N/A'
    case 'cornerstone_leads':
      return (lead.interest as string) || (lead.buyer_type as string) || 'N/A'
    case 'novella_leads':
      return (lead.home_interest as string) || (lead.buyer_type as string) || 'N/A'
    case 'lakeview_village_leads':
      return (lead.project as string) || (lead.buyer_type as string) || 'N/A'
    case 'meadowvale_brooks': {
      const parts = [lead.buyer_type, lead.timeline].filter(Boolean) as string[]
      return parts.length ? parts.join(' · ') : 'N/A'
    }
    case 'rollingwood_leads':
      return (lead.purchase_timeframe as string) || (lead.lead_type as string) || 'N/A'
    case 'hawthorne_east_village':
      return 'N/A'
    default:
      return 'N/A'
  }
}

async function appendLeadToGoogleSheet(lead: Record<string, unknown>) {
  try {
    const { google } = await import('googleapis')
    // Handle private key format - add BEGIN/END markers if missing, and convert literal \n to real newlines
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

    // Extract first name and last name (handle firstname/lastname, first_name/last_name, full_name)
    const firstName = (lead.firstname as string) || (lead.first_name as string) ||
      ((lead.full_name as string) || '').split(' ')[0] || 'N/A'
    const lastName = (lead.lastname as string) || (lead.last_name as string) ||
      ((lead.full_name as string) || '').split(' ').slice(1).join(' ') || 'N/A'

    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Toronto', 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    })

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

    // Landing pages: Project Name = website, Company = "Landing Page - {name}", Tag = "Landing Page"
    if (isLandingPageLeadTable(lead.table_name)) {
      const meta = LANDING_PAGE_SHEET_META[lead.table_name]
      tag = resolveLandingPageSheetTag(lead)
      broker = formatBrokerSheetValue(lead)
      interested = resolveInterestedSheetValue(lead)
      projectId = 'N/A'
      const websiteFromPayload = (lead.website_name as string) || (lead.website as string)
      if (lead.table_name === 'enclave') {
        const collection = (lead.collection as string) || ''
        projectName = collection ? `${meta.websiteName} — ${collection}` : meta.websiteName
      } else if (lead.table_name === 'lakeview_village_leads' && lead.project) {
        projectName = `${meta.websiteName} — ${lead.project}`
      } else if (
        (lead.table_name === 'meadowvale_brooks' || lead.table_name === 'the_legacy') &&
        lead.project
      ) {
        projectName = `${meta.websiteName} — ${lead.project}`
      } else if (
        lead.table_name === 'hawthorne_east_village' ||
        lead.table_name === 'bronte_trails' ||
        lead.table_name === 'spruce_trails'
      ) {
        const formLabel = (lead.form_type as string) || ''
        const projectTag = (lead.project_tag as string) || ''
        projectName = projectTag
          ? `${meta.websiteName} — ${projectTag}`
          : formLabel
            ? `${meta.websiteName} — ${formLabel}`
            : meta.websiteName
      } else {
        projectName = websiteFromPayload || meta.websiteName
      }
      landingPage = resolveLandingPageLink(lead, meta)
      company = `Landing Page - ${meta.pageName}`
    } else if (isEmailLeadTable(lead.table_name)) {
      broker = formatIsAgentBrokerSheetValue(lead)
      tag = resolveEmailLeadSheetTag(lead)
    }

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
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:L',
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
    // Don't throw - Google Sheets failure should not break the lead notification flow
  }
}

export async function POST(request: NextRequest) {
  try {
    const lead = await request.json()

    // Log the received payload for debugging
    console.log('===========================================')
    console.log('Received Lead Notification Payload:')
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

    // Determine source
    const source = 
      lead.table_name === 'fj_leads' ? 'FJ' :
      lead.table_name === 'precon_factory_leads' ? 'Precon Factory' :
      lead.table_name === 'precon_factory_website_leads' ? 'Precon Factory Website' :
      lead.table_name === 'gta_lowrise_leads' ? 'GTA Lowrise' :
      lead.table_name === 'rental_leads' ? 'Rental' :
      lead.table_name === 'cornerstone_leads' ? 'Cornerstone' :
      lead.table_name === 'novella_leads' ? 'Novella' :
      lead.table_name === 'lakeview_village_leads' ? 'Lakeview Village' :
      lead.table_name === 'rollingwood_leads' ? 'Rollingwood' :
      lead.table_name === 'enclave' ? 'Enclave' :
      lead.table_name === 'hawthorne_east_village' ? 'Hawthorne East Village' :
      lead.table_name === 'bronte_trails' ? 'Bronte Trails' :
      lead.table_name === 'spruce_trails' ? 'Spruce Trails' :
      lead.table_name === 'meadowvale_brooks' ? 'Meadowvale Brooks' :
      lead.table_name === 'the_legacy' ? 'The Legacy' :
      'Unknown'
    
    const isRentalLead = lead.table_name === 'rental_leads'
    const isLandingPageLead =
      lead.table_name === 'cornerstone_leads' ||
      lead.table_name === 'novella_leads' ||
      lead.table_name === 'lakeview_village_leads' ||
      lead.table_name === 'rollingwood_leads' ||
      lead.table_name === 'enclave' ||
      lead.table_name === 'hawthorne_east_village' ||
      lead.table_name === 'bronte_trails' ||
      lead.table_name === 'spruce_trails' ||
      lead.table_name === 'meadowvale_brooks' ||
      lead.table_name === 'the_legacy'
    const landingPageName =
      lead.table_name === 'cornerstone_leads' ? 'Cornerstone' :
      lead.table_name === 'novella_leads' ? 'Novella' :
      lead.table_name === 'lakeview_village_leads' ? 'Lakeview Village' :
      lead.table_name === 'rollingwood_leads' ? 'Rollingwood' :
      lead.table_name === 'enclave' ? 'Enclave' :
      lead.table_name === 'hawthorne_east_village' ? 'Hawthorne East Village' :
      lead.table_name === 'bronte_trails' ? 'Bronte Trails' :
      lead.table_name === 'spruce_trails' ? 'Spruce Trails' :
      lead.table_name === 'meadowvale_brooks' ? 'Meadowvale Brooks' :
      lead.table_name === 'the_legacy' ? 'The Legacy' :
      ''
    const leadType = isRentalLead ? 'Rental Inquiry' : (lead.isagent ? 'Agent' : 'Buyer')
    
    const leadPath = 
      lead.table_name === 'fj_leads' ? 'fj-leads' :
      lead.table_name === 'precon_factory_leads' ? 'precon-leads' :
      lead.table_name === 'precon_factory_website_leads' ? 'precon-factory-website-leads' :
      lead.table_name === 'gta_lowrise_leads' ? 'gta-lowrise-leads' :
      lead.table_name === 'rental_leads' ? 'rental-leads' :
      (lead.table_name === 'cornerstone_leads' || lead.table_name === 'novella_leads' || lead.table_name === 'lakeview_village_leads' || lead.table_name === 'rollingwood_leads' || lead.table_name === 'enclave' || lead.table_name === 'hawthorne_east_village' || lead.table_name === 'bronte_trails' || lead.table_name === 'spruce_trails' || lead.table_name === 'meadowvale_brooks' || lead.table_name === 'the_legacy') ? 'landing-pages-leads' :
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
      // Landing page lead format - show it's a landing page, name, and all form fields
      message = `📄 New Landing Page Lead! (${landingPageName})

👤 ${displayName}
📧 ${lead.email}
📱 ${lead.phone || 'No phone'}
📋 Landing Page: ${landingPageName}`

      // Novella fields: buyer_type, home_interest, consent
      if (lead.table_name === 'novella_leads') {
        if (lead.buyer_type) message += `\n🏷️ Buyer Type: ${lead.buyer_type}`
        if (lead.home_interest) message += `\n🏠 Home Interest: ${lead.home_interest}`
        if (lead.consent !== undefined) message += `\n✅ Consent: ${lead.consent ? 'Yes' : 'No'}`
      }

      // Cornerstone fields: is_broker, interest, buyer_type, source
      if (lead.table_name === 'cornerstone_leads') {
        const broker = formatBrokerSheetValue(lead)
        if (broker !== 'N/A') message += `\n🏢 Broker: ${broker}`
        if (lead.interest) message += `\n🏠 Interest: ${lead.interest}`
        if (lead.buyer_type) message += `\n🏷️ Buyer Type: ${lead.buyer_type}`
        if (lead.source) message += `\n📌 Source: ${lead.source}`
      }

      // Lakeview Village fields (schema uses project, not home_interest)
      if (lead.table_name === 'lakeview_village_leads') {
        if (lead.project) message += `\n🏠 Project: ${lead.project}`
        if (lead.buyer_type) message += `\n🏷️ Buyer Type: ${lead.buyer_type}`
        if (lead.consent !== undefined) message += `\n✅ Consent: ${lead.consent ? 'Yes' : 'No'}`
        if (lead.status) message += `\n📋 Status: ${lead.status}`
      }

      // Rollingwood fields (same shape as other landing page tables)
      if (lead.table_name === 'rollingwood_leads') {
        if (lead.buyer_type) message += `\n🏷️ Buyer Type: ${lead.buyer_type}`
        if (lead.home_interest) message += `\n🏠 Home Interest: ${lead.home_interest}`
        if (lead.interest) message += `\n🏠 Interest: ${lead.interest}`
        if (lead.is_realtor !== undefined) message += `\n🏢 Realtor: ${lead.is_realtor ? 'Yes' : 'No'}`
        if (lead.consent !== undefined) message += `\n✅ Consent: ${lead.consent ? 'Yes' : 'No'}`
      }

      // Enclave (public.enclave — model / collection / form)
      if (lead.table_name === 'enclave') {
        if (lead.collection) message += `\n🏘️ Collection: ${lead.collection}`
        if (lead.model) message += `\n🏠 Model: ${lead.model}`
        if (lead.form_name) message += `\n📋 Form: ${lead.form_name}`
        if (lead.source) message += `\n📌 Source: ${lead.source}`
      }

      // Meadowvale Brooks / The Legacy (VIP registration — realtor, project)
      if (lead.table_name === 'meadowvale_brooks' || lead.table_name === 'the_legacy') {
        const broker = formatBrokerSheetValue(lead)
        if (broker !== 'N/A') message += `\n🏢 Broker: ${broker}`
        if (lead.buyer_type) message += `\n🏷️ Buyer Type: ${lead.buyer_type}`
        if (lead.timeline) message += `\n📅 Timeline: ${lead.timeline}`
        if (lead.project) message += `\n🏠 Project: ${lead.project}`
        if (lead.source_page) message += `\n🌐 Page: ${lead.source_page}`
        if (lead.utm_source) message += `\n🔗 UTM: ${lead.utm_source}${lead.utm_campaign ? ` / ${lead.utm_campaign}` : ''}`
      }

      // Hawthorne East Village / Bronte Trails / Spruce Trails (same form shape)
      if (
        lead.table_name === 'hawthorne_east_village' ||
        lead.table_name === 'bronte_trails' ||
        lead.table_name === 'spruce_trails'
      ) {
        if (lead.is_broker !== undefined && lead.is_broker !== null && String(lead.is_broker).trim() !== '') {
          message += `\n🏢 Broker: ${lead.is_broker}`
        }
        if (lead.interest) message += `\n🏠 Interest: ${lead.interest}`
        if (lead.project_tag) message += `\n🏷️ Project: ${lead.project_tag}`
        if (lead.form_type) message += `\n📋 Form: ${lead.form_type}`
        if (lead.page_path) message += `\n🌐 Page: ${lead.page_path}`
        if (lead.source) message += `\n📌 Source: ${lead.source}`
        if (lead.utm_source) message += `\n🔗 UTM: ${lead.utm_source}${lead.utm_campaign ? ` / ${lead.utm_campaign}` : ''}`
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
    }
    
      message += `\n🎯 Type: ${leadType}`
    }
    
    message += `\n⏰ Just now

👉 View in Dashboard: ${dashboardUrl}`

    // Determine which phones/emails to notify based on lead type
    const phonesToNotify = isRentalLead 
      ? [...notificationPhones, ...rentalOnlyPhones]
      : notificationPhones

    const emailsToNotify = isRentalLead
      ? [...notificationEmails, ...rentalOnlyEmails]
      : notificationEmails

    // Send email notifications FIRST — Twilio failures must not block email
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

    // Admin SMS — isolated so Twilio issues don't block emails
    const twilioResponses: { phone: string; sid?: string; error?: string }[] = []
    try {
      if (!accountSid || !authToken || !twilioPhone) {
        console.error(
          'Admin SMS skipped: missing Twilio env (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)'
        )
        for (const phone of phonesToNotify) {
          twilioResponses.push({ phone, error: 'Twilio not configured' })
        }
      } else {
        const results = await Promise.allSettled(
          phonesToNotify.map(async rawPhone => {
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
          const phone = phonesToNotify[i]
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
      for (const phone of phonesToNotify) {
        if (!twilioResponses.some(t => t.phone === phone)) {
          twilioResponses.push({
            phone,
            error: smsError instanceof Error ? smsError.message : String(smsError)
          })
        }
      }
    }

    // Append lead to Google Sheet (non-blocking, won't break existing flow)
    try {
      await appendLeadToGoogleSheet(lead)
    } catch (sheetError) {
      console.error('Google Sheets error (non-critical):', sheetError)
    }

    const smsErrors = twilioResponses.filter(t => t.error)
    if (smsErrors.length > 0) {
      console.warn('Some admin lead SMS failed:', smsErrors)
    }

    console.log('Lead notifications sent:', {
      leadId: lead.id,
      source: source,
      adminSms: twilioResponses,
      adminEmails: emailResponses,
    })

    return NextResponse.json({
      success: true,
      adminSms: twilioResponses,
      messageSids: twilioResponses.map(r => r.sid).filter(Boolean),
      smsRecipients: phonesToNotify,
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

