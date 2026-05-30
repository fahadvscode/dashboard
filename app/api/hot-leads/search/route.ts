import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  buildDisplayName,
  SEARCHABLE_LEAD_TABLES,
  type LeadSearchResult,
  type LeadSourceTable,
} from '@/lib/hotLeads'

const RESULTS_PER_TABLE = 10

const LANDING_PAGE_TABLES = new Set([
  'cornerstone_leads',
  'novella_leads',
  'lakeview_village_leads',
])

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

    if (q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const supabase = getSupabaseAdmin()
    const pattern = `%${escapeIlike(q)}%`

    const searches = SEARCHABLE_LEAD_TABLES.map(async (table) => {
      const orFilter = LANDING_PAGE_TABLES.has(table)
        ? `first_name.ilike.${pattern},last_name.ilike.${pattern},firstname.ilike.${pattern},lastname.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`
        : `firstname.ilike.${pattern},lastname.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`

      const { data, error } = await supabase
        .from(table)
        .select('id, firstname, lastname, first_name, last_name, email, phone, project_name')
        .or(orFilter)
        .limit(RESULTS_PER_TABLE)

      if (error) {
        console.warn(`Search failed for ${table}:`, error.message)
        return [] as LeadSearchResult[]
      }

      return (data ?? []).map((row) => {
        const first = row.firstname ?? row.first_name
        const last = row.lastname ?? row.last_name
        return {
          source_table: table as LeadSourceTable,
          source_id: String(row.id),
          display_name: buildDisplayName(first, last),
          phone: row.phone ?? null,
          email: row.email ?? null,
          project_name: row.project_name ?? null,
        }
      })
    })

    const nested = await Promise.all(searches)
    const results = nested.flat().slice(0, 40)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching leads:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search leads' },
      { status: 500 }
    )
  }
}
