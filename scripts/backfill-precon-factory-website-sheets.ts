/**
 * Backfill all precon_factory_website_leads into the shared Google Sheet (Sheet1 A:M)
 * with the same tags/mapping as live notifications.
 *
 * Loads `.env.local` then `.env` from repo root.
 *
 *   DRY_RUN=1 npm run sheets:backfill-precon-website   # counts only
 *   npm run sheets:backfill-precon-website             # append missing rows
 *
 * Skips rows already on the sheet when email + project ID + timestamp match.
 */

import { resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const {
    appendRowsToLeadGoogleSheet,
    readLeadGoogleSheetValues,
  } = await import('../lib/leadGoogleSheets')
  const {
    buildPreconFactoryWebsiteLeadSheetRow,
    preconFactoryWebsiteSheetDedupeKey,
  } = await import('../lib/preconFactoryWebsiteSheet')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: leads, error } = await supabase
    .from('precon_factory_website_leads')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  const rows = (leads ?? []).map((lead) =>
    buildPreconFactoryWebsiteLeadSheetRow(lead as Record<string, unknown>)
  )

  console.log(`Supabase precon_factory_website_leads: ${rows.length} row(s)`)

  const existing = await readLeadGoogleSheetValues()
  const existingKeys = new Set<string>()
  for (const row of existing) {
    if (row.length >= 9) {
      existingKeys.add(preconFactoryWebsiteSheetDedupeKey(row))
    }
  }

  const toAppend = rows.filter((row) => !existingKeys.has(preconFactoryWebsiteSheetDedupeKey(row)))
  console.log(`Already on sheet (skipped): ${rows.length - toAppend.length}`)
  console.log(`To append: ${toAppend.length}`)

  if (DRY_RUN) {
    console.log('DRY_RUN — no rows written.')
    if (toAppend.length > 0) {
      console.log('Sample row:', toAppend[0])
    }
    return
  }

  if (toAppend.length === 0) {
    console.log('Nothing to append.')
    return
  }

  const appended = await appendRowsToLeadGoogleSheet(toAppend)
  console.log(`Appended ${appended} row(s) to Google Sheet.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
