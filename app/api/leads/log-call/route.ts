import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const ALLOWED_TABLES = new Set(['fj_leads', 'precon_factory_leads', 'precon_factory_website_leads', 'gta_lowrise_leads', 'rental_leads', 'cornerstone_leads', 'novella_leads', 'lakeview_village_leads', 'rollingwood_leads'])

type CallHistoryEntry = {
  outcome: string
  note: string
  timestamp: string
}

type LeanLead = {
  id: string
  call_count: number | null
  call_history: unknown
  last_note: string | null
}

const parseCallHistory = (value: unknown): CallHistoryEntry[] => {
  if (!value) return []
  if (Array.isArray(value)) return value as CallHistoryEntry[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as CallHistoryEntry[]) : []
    } catch {
      return []
    }
  }
  return []
}

export async function POST(request: NextRequest) {
  try {
    let client: ReturnType<typeof getSupabaseAdmin>
    try {
      client = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ error: 'Server database is not configured.' }, { status: 503 })
    }

    const { table, leadId, outcome, note } = await request.json()

    if (!table || !ALLOWED_TABLES.has(table) || !leadId || !outcome) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }

    const timestamp = new Date().toISOString()

    const { data: existingLead, error: fetchError } = await client
      .from(table)
      .select('id, call_count, call_history, last_note')
      .eq('id', leadId)
      .single()

    if (fetchError || !existingLead) {
      console.error('Log call fetch error:', fetchError)
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
    }

    const leanLead = existingLead as LeanLead

    const currentHistory = parseCallHistory(leanLead.call_history)
    const updatedHistory: CallHistoryEntry[] = [
      ...currentHistory,
      {
        outcome,
        note: typeof note === 'string' ? note.trim() : '',
        timestamp
      }
    ]
    const updatedCount = (leanLead.call_count ?? 0) + 1
    const updatedLastNote =
      typeof note === 'string' && note.trim().length > 0 ? note.trim() : leanLead.last_note

    const updates: Record<string, unknown> = {
      call_count: updatedCount,
      call_history: updatedHistory,
      last_note: updatedLastNote
    }

    const { data: updatedLead, error: updateError } = await client
      .from(table)
      .update(updates)
      .eq('id', leadId)
      .select('*')
      .single()

    if (updateError || !updatedLead) {
      console.error('Log call update error:', updateError)
      return NextResponse.json({ error: 'Failed to log call.' }, { status: 500 })
    }

    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error('Log call route error:', error)
    return NextResponse.json({ error: 'Unexpected error logging call.' }, { status: 500 })
  }
}

