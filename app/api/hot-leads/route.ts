import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  type HotLeadPriority,
  isValidLeadSourceTable,
  isValidPriority,
} from '@/lib/hotLeads'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('hot_leads')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ leads: data ?? [] })
  } catch (error) {
    console.error('Error fetching hot leads:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hot leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const sourceType = body.source_type === 'linked' ? 'linked' : 'manual'

    if (sourceType === 'linked') {
      const { source_table, source_id, display_name, phone, email, project_name, notes, priority } = body

      if (!source_table || !source_id || !display_name) {
        return NextResponse.json(
          { error: 'source_table, source_id, and display_name are required for linked leads' },
          { status: 400 }
        )
      }

      if (!isValidLeadSourceTable(source_table)) {
        return NextResponse.json({ error: 'Invalid source_table' }, { status: 400 })
      }

      const resolvedPriority: HotLeadPriority =
        priority && isValidPriority(priority) ? priority : 'new'

      const { data: existing } = await supabase
        .from('hot_leads')
        .select('id')
        .eq('source_type', 'linked')
        .eq('source_table', source_table)
        .eq('source_id', String(source_id))
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'This lead is already on your Hot Leads list' },
          { status: 409 }
        )
      }

      const { data: maxRow } = await supabase
        .from('hot_leads')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      const sortOrder = (maxRow?.sort_order ?? -1) + 1

      const { data, error } = await supabase
        .from('hot_leads')
        .insert({
          display_name: String(display_name).trim(),
          phone: phone?.trim() || null,
          email: email?.trim() || null,
          project_name: project_name?.trim() || null,
          notes: notes?.trim() || null,
          priority: resolvedPriority,
          source_type: 'linked',
          source_table,
          source_id: String(source_id),
          sort_order: sortOrder,
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ lead: data })
    }

    const { display_name, phone, email, project_name, notes, priority } = body

    if (!display_name?.trim()) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
    }

    const resolvedPriority: HotLeadPriority =
      priority && isValidPriority(priority) ? priority : 'new'

    const { data: maxRow } = await supabase
      .from('hot_leads')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (maxRow?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('hot_leads')
      .insert({
        display_name: String(display_name).trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        project_name: project_name?.trim() || null,
        notes: notes?.trim() || null,
        priority: resolvedPriority,
        source_type: 'manual',
        source_table: null,
        source_id: null,
        sort_order: sortOrder,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ lead: data })
  } catch (error) {
    console.error('Error creating hot lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create hot lead' },
      { status: 500 }
    )
  }
}
