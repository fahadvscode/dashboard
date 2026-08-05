import { NextRequest, NextResponse } from 'next/server'
import { appendCleaningLeadToGoogleSheet } from '@/lib/cleaningLeadsSheet'

/** Sheets only — new cleaning_leads inserts from Supabase pg_net trigger. */
export async function POST(request: NextRequest) {
  try {
    const lead = (await request.json()) as Record<string, unknown>

    const tableName = lead.table_name ?? lead.tableName ?? lead.table
    if (tableName !== undefined && tableName !== 'cleaning_leads') {
      return NextResponse.json({ error: 'Invalid table for cleaning sheets route' }, { status: 400 })
    }

    await appendCleaningLeadToGoogleSheet(lead)

    return NextResponse.json({ success: true, sheetTab: 'Cleaning Leads' })
  } catch (error) {
    console.error('cleaning_leads Google Sheet append failed:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
