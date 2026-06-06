import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for admin operations (bypasses RLS)
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

    // Validate inputs
    if (!table || !leadIds) {
      return NextResponse.json(
        { error: 'Table and lead IDs are required' },
        { status: 400 }
      )
    }

    // Validate table name
    const validTables = ['fj_leads', 'precon_factory_leads', 'precon_factory_website_leads', 'gta_lowrise_leads', 'rental_leads', 'cornerstone_leads', 'novella_leads', 'lakeview_village_leads', 'rollingwood_leads', 'enclave', 'hawthorne_east_village']
    if (!validTables.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    // Validate leadIds is an array
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Lead IDs must be a non-empty array' },
        { status: 400 }
      )
    }

    // Delete leads
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

