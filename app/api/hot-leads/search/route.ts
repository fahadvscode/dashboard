import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  fetchContactSuggestions,
  minQueryLength,
  searchContacts,
} from '@/lib/hotLeadsSearch'

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    const supabase = getSupabaseAdmin()

    if (!q) {
      const suggestions = await fetchContactSuggestions(supabase)
      return NextResponse.json({ results: suggestions, mode: 'suggestions' })
    }

    const minLen = minQueryLength(q)
    if (q.length < minLen) {
      return NextResponse.json({
        results: [],
        mode: 'search',
        hint: minLen === 3 ? 'Enter at least 3 digits for phone search' : 'Type a name, email, or phone',
      })
    }

    const results = await searchContacts(supabase, q)
    return NextResponse.json({ results, mode: 'search' })
  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search' },
      { status: 500 }
    )
  }
}
