import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SEARCH_CONSOLE_TOKEN_TYPE } from '@/lib/searchConsole'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase
      .from('calendar_tokens')
      .delete()
      .eq('calendar_type', SEARCH_CONSOLE_TOKEN_TYPE)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
