/**
 * Invite sales@fahadsold.com to non-interview calendar events from today onward
 * so they appear on the sales calendar. Uses sendUpdates: 'all' so Google sends
 * the invite.
 *
 * From repo root:
 *   DRY_RUN=1 npx tsx scripts/invite-sales-to-upcoming-events.ts
 *   npx tsx scripts/invite-sales-to-upcoming-events.ts
 */

import { resolve } from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { OAuth2Client } from 'google-auth-library'
import { calendar as calendarFactory } from 'googleapis/build/src/apis/calendar/index.js'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const SALES_EMAIL = 'sales@fahadsold.com'
const SALES_NAME = 'Sales'

const CALENDAR_IDS: Record<string, string> = {
  fj: 'c_c0a660e131ad53344fa1d41404b0beafcde60bc4ea44e19020ad14eb84bcd46d@group.calendar.google.com',
  precon:
    'c_30f7e817768b30f4813c9711b2f66fa238221af7a6ba0fb5d284de514afeb400@group.calendar.google.com',
  gtalowrise:
    'c_c702f7be6ca9312d4fccf118aaff244390379e2b07f3f5ef47b3ee609fa49475@group.calendar.google.com',
}

function normEmail(e: string | undefined | null) {
  return (e || '').trim().toLowerCase()
}

function torontoTodayStart() {
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  return `${dateStr}T00:00:00-04:00`
}

function isInterviewEvent(summary?: string | null) {
  return /interview/i.test(summary || '')
}

async function getCalendarApi() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const clientId = process.env.QIKFILL_GOOGLE_CLIENT_ID
  const clientSecret = process.env.QIKFILL_GOOGLE_CLIENT_SECRET

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  if (!clientId || !clientSecret) {
    throw new Error('Missing QIKFILL_GOOGLE_CLIENT_ID or QIKFILL_GOOGLE_CLIENT_SECRET')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: tokenData, error } = await supabase
    .from('calendar_tokens')
    .select('*')
    .eq('calendar_type', 'qikfill')
    .single()

  if (error || !tokenData) {
    throw new Error('calendar_tokens (qikfill) missing — complete /api/calendar/oauth first')
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret)
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date,
  })

  if (tokenData.expiry_date && new Date(tokenData.expiry_date) <= new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    await supabase
      .from('calendar_tokens')
      .update({
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      })
      .eq('calendar_type', 'qikfill')
    oauth2Client.setCredentials(credentials)
  }

  return calendarFactory({ version: 'v3', auth: oauth2Client })
}

async function main() {
  const dryRun =
    process.env.DRY_RUN === '1' ||
    process.env.DRY_RUN === 'true' ||
    process.env.DRY_RUN === 'yes'
  const timeMin = process.env.BACKFILL_TIME_MIN ?? torontoTodayStart()

  console.log('Invite sales to upcoming non-interview events', {
    dryRun,
    timeMin,
    sales: SALES_EMAIL,
  })

  const calendar = await getCalendarApi()

  let invited = 0
  let skippedAlready = 0
  let skippedInterview = 0
  let skippedCancelled = 0
  let skippedOther = 0
  let failed = 0

  for (const [label, calendarId] of Object.entries(CALENDAR_IDS)) {
    console.log(`\n--- ${label} ---`)
    let pageToken: string | undefined

    do {
      const listRes = await calendar.events.list({
        calendarId,
        timeMin,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
        pageToken,
        showDeleted: false,
      })

      const items = listRes.data.items ?? []
      pageToken = listRes.data.nextPageToken ?? undefined

      for (const ev of items) {
        if (!ev.id) {
          skippedOther++
          continue
        }
        if (ev.status === 'cancelled') {
          skippedCancelled++
          continue
        }
        if (isInterviewEvent(ev.summary)) {
          skippedInterview++
          console.log(`skip interview: ${ev.summary}`)
          continue
        }

        let attendees = ev.attendees
        if (attendees === undefined) {
          const full = await calendar.events.get({
            calendarId,
            eventId: ev.id,
          })
          attendees = full.data.attendees ?? []
        }

        if (attendees.some((a) => normEmail(a.email) === normEmail(SALES_EMAIL))) {
          skippedAlready++
          continue
        }

        const withEmail = attendees.filter((a) => a.email)
        const newAttendees = [
          ...withEmail.map((a) => ({
            email: a.email as string,
            ...(a.displayName ? { displayName: a.displayName } : {}),
          })),
          { email: SALES_EMAIL, displayName: SALES_NAME },
        ]

        const start = ev.start?.dateTime || ev.start?.date || ''
        const title = ev.summary ?? ev.id
        console.log(`${dryRun ? '[DRY_RUN] ' : ''}invite: ${start} | ${title}`)

        if (dryRun) {
          invited++
          continue
        }

        try {
          await calendar.events.patch({
            calendarId,
            eventId: ev.id,
            requestBody: { attendees: newAttendees },
            sendUpdates: 'all',
          })
          invited++
        } catch (e) {
          failed++
          console.error(`PATCH failed [${label}] ${ev.id} ${title}:`, e)
        }

        await new Promise((r) => setTimeout(r, 100))
      }
    } while (pageToken)
  }

  console.log('\nDone.', {
    invited,
    skippedAlreadyHasSales: skippedAlready,
    skippedInterview,
    skippedCancelled,
    skippedOther,
    failed,
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
