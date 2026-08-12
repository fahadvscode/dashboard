import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchLandingPageSources, isValidLandingPageTableName } from '@/lib/landingPageSources'

const CORE_TABLES = new Set([
  'fj_leads',
  'precon_factory_leads',
  'precon_factory_website_leads',
  'gta_lowrise_leads',
  'rental_leads',
])

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { table, leadIds } = await request.json()

    if (!table || !leadIds) {
      return NextResponse.json(
        { error: 'Table and lead IDs are required' },
        { status: 400 }
      )
    }

    if (!isValidLandingPageTableName(table) && !CORE_TABLES.has(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
    }

    const landingSources = await fetchLandingPageSources({ enabledOnly: false })
    const landingTables = new Set(landingSources.map((s) => s.table_name))
    if (!CORE_TABLES.has(table) && !landingTables.has(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 })
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs must be a non-empty array' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', leadIds)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      deletedCount: leadIds.length
    })
  } catch (error) {
    console.error('Error deleting leads:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete leads' },
      { status: 500 }
    )
  }
}
