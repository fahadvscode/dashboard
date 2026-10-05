import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { brokerErrorResponse, rejectUnlessBroker } from '@/lib/brokerGuideServer'

export const dynamic = 'force-dynamic'

type PropertyHit = {
  id: string
  project_name: string | null
  city: string | null
  builder: string | null
}

/** Read-only lookup. This route never inserts, updates, or deletes canada_properties. */
export async function GET(request: NextRequest) {
  const denied = rejectUnlessBroker(request)
  if (denied) return denied

  const query = (request.nextUrl.searchParams.get('q') ?? '').trim()
  if (query.length < 2) return NextResponse.json({ results: [] })

  const safe = query.replace(/[%_,]/g, '').slice(0, 80)
  if (safe.length < 2) return NextResponse.json({ results: [] })

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('canada_properties')
      .select('id, project_name, city, builder')
      .ilike('project_name', `%${safe}%`)
      .limit(8)

    if (error) throw error

    const results = ((data ?? []) as PropertyHit[]).map((row) => ({
      id: row.id,
      project_name: row.project_name ?? '',
      city: row.city ?? '',
      builder: row.builder ?? '',
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Broker guide search failed:', error)
    return brokerErrorResponse(error)
  }
}
