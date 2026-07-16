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
    const { table, bookingIds } = await request.json()

    // Validate inputs
    if (!table || !bookingIds) {
      return NextResponse.json(
        { error: 'Table and booking IDs are required' },
        { status: 400 }
      )
    }

    // Validate table name
    const validTables = ['fj_bookings', 'precon_factory_bookings', 'gta_lowrise_bookings']
    if (!validTables.includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      )
    }

    // Validate bookingIds is an array
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { error: 'Booking IDs must be a non-empty array' },
        { status: 400 }
      )
    }

    // Delete bookings
    const { error } = await supabase
      .from(table)
      .delete()
      .in('id', bookingIds)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      deletedCount: bookingIds.length
    })

  } catch (error) {
    console.error('Error deleting bookings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete bookings' },
      { status: 500 }
    )
  }
}

