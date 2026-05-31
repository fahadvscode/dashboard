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
    const { table, leadId, temperature } = await request.json()

    // Validate inputs
    if (!table || !leadId || !temperature) {
      return NextResponse.json(
        { error: 'Table, lead ID, and temperature are required' },
        { status: 400 }
      )
    }

    // Validate temperature value
    const validTemperatures = ['hot', 'warm', 'cold']
    if (!validTemperatures.includes(temperature)) {
      return NextResponse.json(
        { error: 'Invalid temperature. Must be hot, warm, or cold' },
        { status: 400 }
      )
    }

    // Validate table name
    const validTables = ['fj_leads', 'precon_factory_leads', 'precon_factory_website_leads', 'gta_lowrise_leads', 'rental_leads', 'cornerstone_leads', 'novella_leads', 'lakeview_village_leads', 'rollingwood_leads']
    if (!validTables.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    // Update lead temperature
    const { data, error } = await supabase
      .from(table)
      .update({ lead_temperature: temperature })
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      lead: data
    })

  } catch (error) {
    console.error('Error updating lead temperature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update lead temperature' },
      { status: 500 }
    )
  }
}

