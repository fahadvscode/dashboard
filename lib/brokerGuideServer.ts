import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  brokerCodeMatches,
  isMissingBrokerTable,
  parseProjectInput,
  type BrokerPlace,
  type BrokerProject,
  type ProjectInput,
} from '@/lib/brokerGuide'

type PlaceRow = BrokerPlace

type ProjectRow = Omit<BrokerProject, 'places'> & {
  broker_guide_places: PlaceRow[] | null
}

export function rejectUnlessBroker(request: NextRequest): NextResponse | null {
  if (!brokerCodeMatches(request.headers.get('x-broker-code'))) {
    return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 })
  }
  return null
}

export function brokerErrorResponse(error: unknown) {
  const details = error as { code?: string; message?: string }
  if (isMissingBrokerTable(details)) {
    return NextResponse.json(
      {
        error: 'Broker Guide is not set up yet. Run database/setup_broker_guide.sql in the Supabase SQL editor.',
        setupRequired: true,
      },
      { status: 503 }
    )
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return NextResponse.json({ error: message }, { status: 500 })
}

function mapProject(row: ProjectRow): BrokerProject {
  const places = [...(row.broker_guide_places ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return {
    id: row.id,
    city: row.city,
    project_name: row.project_name,
    canada_property_id: row.canada_property_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    places,
  }
}

export async function listBrokerProjects(): Promise<BrokerProject[]> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('broker_guide_projects')
    .select('*, broker_guide_places(*)')
    .order('project_name', { ascending: true })

  if (error) throw error
  return ((data ?? []) as ProjectRow[]).map(mapProject)
}

async function replacePlaces(projectId: string, input: ProjectInput) {
  const supabase = getSupabaseAdmin()
  const { data: existing, error: readError } = await supabase
    .from('broker_guide_places')
    .select('id')
    .eq('project_id', projectId)

  if (readError) throw readError

  const rows = input.places.map((place, index) => ({
    project_id: projectId,
    place_type: place.place_type,
    map_url: place.map_url,
    cross_streets: place.cross_streets,
    address: place.address,
    phone: place.phone,
    hours: place.hours,
    website: place.website,
    contacts: place.contacts,
    note: place.note,
    sort_order: index,
  }))

  const { error: insertError } = await supabase.from('broker_guide_places').insert(rows as never)
  if (insertError) throw insertError

  const oldIds = ((existing ?? []) as { id: string }[]).map((row) => row.id)
  if (oldIds.length > 0) {
    const { error: deleteError } = await supabase.from('broker_guide_places').delete().in('id', oldIds)
    if (deleteError) throw deleteError
  }
}

export async function createBrokerProject(body: unknown) {
  const parsed = parseProjectInput(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('broker_guide_projects')
    .insert({
      city: parsed.data.city,
      project_name: parsed.data.project_name,
      canada_property_id: parsed.data.canada_property_id,
    } as never)
    .select('id')
    .single()

  if (error) throw error
  const id = (data as { id: string }).id

  try {
    await replacePlaces(id, parsed.data)
  } catch (placeError) {
    await supabase.from('broker_guide_projects').delete().eq('id', id)
    throw placeError
  }

  return NextResponse.json({ id })
}

export async function updateBrokerProject(id: string, body: unknown) {
  const parsed = parseProjectInput(body)
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('broker_guide_projects')
    .update({
      city: parsed.data.city,
      project_name: parsed.data.project_name,
      canada_property_id: parsed.data.canada_property_id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)

  if (error) throw error
  await replacePlaces(id, parsed.data)
  return NextResponse.json({ id })
}

export async function deleteBrokerProject(id: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('broker_guide_projects').delete().eq('id', id)
  if (error) throw error
  return NextResponse.json({ ok: true })
}
