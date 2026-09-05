import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE } from '@/lib/interviewBookingConstants'

const PAGE_SIZE = 1000

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const bookings: Record<string, unknown>[] = []
    let from = 0

    for (;;) {
      const { data, error } = await supabase
        .from(FAHAD_SELLS_INTERVIEW_BOOKINGS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      const batch = (data ?? []) as Record<string, unknown>[]
      bookings.push(...batch)
      if (batch.length < PAGE_SIZE) break
      from += PAGE_SIZE
      if (from >= 10000) break
    }

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('Error listing interview bookings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list interview bookings' },
      { status: 500 }
    )
  }
}
