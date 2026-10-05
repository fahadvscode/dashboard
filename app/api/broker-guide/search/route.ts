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

  const safe = query.replace(/[%_,.()]/g, '').slice(0, 80)
  if (safe.length < 2) return NextResponse.json({ results: [] })

  try {
    const supabase = getSupabaseAdmin()
    const select = 'id, project_name, city, builder'
    const byNameOrBuilder = `project_name.ilike.%${safe}%,builder.ilike.%${safe}%`
    let { data, error } = await supabase
      .from('canada_properties')
      .select(select)
      .or(`${byNameOrBuilder},id.ilike.%${safe}%`)
      .limit(8)

    if (error && /uuid|operator does not exist|invalid input syntax/i.test(error.message ?? '')) {
      const exactId = /^\d+$/.test(safe) || /^[0-9a-f-]{32,36}$/i.test(safe)
      const retry = await supabase
        .from('canada_properties')
        .select(select)
        .or(exactId ? `${byNameOrBuilder},id.eq.${safe}` : byNameOrBuilder)
        .limit(8)
      data = retry.data
      error = retry.error
    }

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
