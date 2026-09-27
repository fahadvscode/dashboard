import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  loadAreaPlaces,
  proximityFor,
  type LatLng,
} from '@/lib/cityProjectProximity'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

type PropertyRow = {
  id: string
  project_name: string
  address?: string | null
  city?: string | null
  builder?: string | null
  price?: string | null
  bedrooms?: string | null
  bathrooms?: string | null
  pictures?: string | null
  map_address?: string | null
  map_lat?: number | null
  map_lng?: number | null
}

async function geocode(query: string): Promise<LatLng | null> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': 'property-dashboard/1.0' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as { features?: Array<{ geometry?: { coordinates?: number[] } }> }
  const coords = data.features?.[0]?.geometry?.coordinates
  const lng = coords?.[0]
  const lat = coords?.[1]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const city = request.nextUrl.searchParams.get('city')?.trim() || ''

    if (!city) {
      const { data, error } = await supabase.from('canada_properties').select('city').limit(5000)
      if (error) throw error
      const cities = [
        ...new Set(
          ((data || []) as Array<{ city?: string | null }>)
            .map((row) => String(row.city || '').trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b))
      return NextResponse.json({ cities })
    }

    const { data, error } = await supabase
      .from('canada_properties')
      .select('id, project_name, address, city, builder, price, bedrooms, bathrooms, pictures, map_address, map_lat, map_lng')
      .ilike('city', city)
      .limit(200)
    if (error) throw error

    const rows = (data || []) as PropertyRow[]
    const located: Array<PropertyRow & LatLng> = []
    const missing: PropertyRow[] = []

    for (const row of rows) {
      const lat = Number(row.map_lat)
      const lng = Number(row.map_lng)
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
        located.push({ ...row, lat, lng })
      } else {
        missing.push(row)
      }
    }

    const queue = [...missing]
    async function geocodeNext() {
      const row = queue.shift()
      if (!row) return
      try {
        const query = [row.map_address || row.address, row.city, 'Ontario, Canada'].filter(Boolean).join(', ')
        const point = query.trim() ? await geocode(query) : null
        if (point) {
          located.push({ ...row, ...point })
          void supabase
            .from('canada_properties')
            .update({ map_lat: point.lat, map_lng: point.lng } as never)
            .eq('id', row.id)
        }
      } catch {
        // Skip an address the geocoder cannot place.
      }
      await geocodeNext()
    }
    await Promise.all(Array.from({ length: 6 }, () => geocodeNext()))

    const places = await loadAreaPlaces(located)
    const projects = located.map((row) => ({
      id: row.id,
      project_name: row.project_name,
      address: row.address || row.map_address || '',
      city: row.city || city,
      builder: row.builder || '',
      price: row.price || '',
      bedrooms: row.bedrooms || '',
      bathrooms: row.bathrooms || '',
      pictures: row.pictures || '',
      lat: row.lat,
      lng: row.lng,
      proximity: proximityFor({ lat: row.lat, lng: row.lng }, places),
    }))

    const goStations = places.goStations.filter((station) =>
      projects.some((project) => {
        const dLat = (station.lat - project.lat) * 111320
        const dLng = (station.lng - project.lng) * 111320 * Math.cos((project.lat * Math.PI) / 180)
        return Math.hypot(dLat, dLng) < 20000
      })
    )

    return NextResponse.json({
      city,
      total: rows.length,
      mapped: projects.length,
      projects,
      places: {
        go: goStations,
        school: places.schools,
        grocery: places.groceries,
        hospital: places.hospitals,
        park: places.parks,
      },
    })
  } catch (error) {
    console.error('City project map failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load city projects.' },
      { status: 500 }
    )
  }
}
