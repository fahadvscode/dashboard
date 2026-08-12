import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  clearLandingPageSourcesCache,
  detectNameStyle,
  fetchLandingPageSources,
  generateLandingPageSetupSql,
  isValidLandingPageTableName,
  sanitizeSiteUrl,
  verifyLeadTable,
  type LandingPageNameStyle,
} from '@/lib/landingPageSources'

export async function GET(request: NextRequest) {
  try {
    const enabledOnly = request.nextUrl.searchParams.get('enabled') === '1'
    const table = request.nextUrl.searchParams.get('table')?.trim().toLowerCase()
    const wantSql = request.nextUrl.searchParams.get('sql') === '1'

    const sources = await fetchLandingPageSources({
      enabledOnly,
      bypassCache: request.nextUrl.searchParams.get('fresh') === '1',
    })

    if (table && wantSql) {
      const source = sources.find((s) => s.table_name === table)
      const sql = generateLandingPageSetupSql({
        table_name: table,
        display_name: source?.display_name,
      })
      return NextResponse.json({ table_name: table, sql })
    }

    return NextResponse.json({ sources })
  } catch (error) {
    console.error('landing-page-sources GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = typeof body.action === 'string' ? body.action : 'create'

    if (action === 'verify') {
      const tableName = String(body.table_name || '').trim().toLowerCase()
      const result = await verifyLeadTable(tableName)
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (action === 'sql') {
      const tableName = String(body.table_name || '').trim().toLowerCase()
      const displayName = String(body.display_name || '').trim()
      const sql = generateLandingPageSetupSql({
        table_name: tableName,
        display_name: displayName || undefined,
      })
      return NextResponse.json({ table_name: tableName, sql })
    }

    const tableName = String(body.table_name || '').trim().toLowerCase()
    if (!isValidLandingPageTableName(tableName)) {
      return NextResponse.json(
        {
          error:
            'Invalid table_name. Use lowercase letters, numbers, underscores; start with a letter (e.g. my_project_leads).',
        },
        { status: 400 }
      )
    }

    const displayName = String(body.display_name || '').trim()
    if (!displayName) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 })
    }

    const pageName = String(body.page_name || displayName).trim() || displayName
    const siteUrl = sanitizeSiteUrl(String(body.site_url || ''))
    let nameStyle = (String(body.name_style || 'auto') as LandingPageNameStyle)
    if (!['auto', 'firstname', 'first_name'].includes(nameStyle)) nameStyle = 'auto'

    if (nameStyle === 'auto') {
      try {
        const detected = await detectNameStyle(tableName)
        if (detected !== 'auto') nameStyle = detected
      } catch {
        // keep auto
      }
    }

    const enabled = body.enabled !== false
    const hasCrm = Boolean(body.has_crm)
    const notes = body.notes != null ? String(body.notes) : null

    const supabase = getSupabaseAdmin()
    const { data, error } = await (supabase as any)
      .from('landing_page_lead_sources')
      .upsert(
        {
          table_name: tableName,
          display_name: displayName,
          page_name: pageName,
          site_url: siteUrl,
          name_style: nameStyle,
          enabled,
          has_crm: hasCrm,
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'table_name' }
      )
      .select('*')
      .single()

    if (error) {
      console.error('landing_page_lead_sources upsert:', error)
      return NextResponse.json(
        {
          error: error.message.includes('landing_page_lead_sources')
            ? 'Registry table missing. Run setup_landing_page_lead_sources.sql in Supabase first.'
            : error.message,
        },
        { status: 500 }
      )
    }

    clearLandingPageSourcesCache()

    const sql = generateLandingPageSetupSql({
      table_name: tableName,
      display_name: displayName,
    })

    const verify = await verifyLeadTable(tableName)

    return NextResponse.json({
      source: data,
      sql,
      verify,
      next_steps: [
        'Run the returned SQL in Supabase SQL Editor (RLS + notify trigger).',
        'Confirm the website inserts into this table name.',
        'Submit a test lead — you should get email, SMS, and a Google Sheet row.',
      ],
    })
  } catch (error) {
    console.error('landing-page-sources POST:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save source' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const tableName = String(body.table_name || '').trim().toLowerCase()
    if (!isValidLandingPageTableName(tableName)) {
      return NextResponse.json({ error: 'Invalid table_name' }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.display_name != null) patch.display_name = String(body.display_name).trim()
    if (body.page_name != null) patch.page_name = String(body.page_name).trim()
    if (body.site_url != null) patch.site_url = sanitizeSiteUrl(String(body.site_url))
    if (body.name_style != null) patch.name_style = body.name_style
    if (body.enabled != null) patch.enabled = Boolean(body.enabled)
    if (body.has_crm != null) patch.has_crm = Boolean(body.has_crm)
    if (body.notes !== undefined) patch.notes = body.notes

    const supabase = getSupabaseAdmin()
    const { data, error } = await (supabase as any)
      .from('landing_page_lead_sources')
      .update(patch)
      .eq('table_name', tableName)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Source not in registry. Add it first (POST).' },
        { status: 404 }
      )
    }

    clearLandingPageSourcesCache()
    return NextResponse.json({ source: data })
  } catch (error) {
    console.error('landing-page-sources PATCH:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update source' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tableName =
      request.nextUrl.searchParams.get('table')?.trim().toLowerCase() ||
      String((await request.json().catch(() => ({}))).table_name || '').trim().toLowerCase()

    if (!isValidLandingPageTableName(tableName)) {
      return NextResponse.json({ error: 'Invalid table_name' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await (supabase as any)
      .from('landing_page_lead_sources')
      .delete()
      .eq('table_name', tableName)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    clearLandingPageSourcesCache()
    return NextResponse.json({
      ok: true,
      note: 'Removed from registry only. Lead table and trigger (if any) were not dropped.',
    })
  } catch (error) {
    console.error('landing-page-sources DELETE:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete source' },
      { status: 500 }
    )
  }
}
