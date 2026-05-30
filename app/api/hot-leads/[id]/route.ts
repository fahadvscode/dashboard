import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isValidPriority } from '@/lib/hotLeads'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const updates: Record<string, unknown> = {}

    if (body.priority !== undefined) {
      if (!isValidPriority(body.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updates.priority = body.priority
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes?.trim() || null
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = Number(body.sort_order)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hot_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ lead: data })
  } catch (error) {
    console.error('Error updating hot lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update hot lead' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = getSupabaseAdmin()

    const { error } = await supabase.from('hot_leads').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hot lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete hot lead' },
      { status: 500 }
    )
  }
}
