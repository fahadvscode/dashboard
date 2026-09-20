import { NextRequest, NextResponse } from 'next/server'

type Amenity = {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  straightDist: number
  walkTime?: string
  walkDist?: string
  driveTime?: string
  driveDist?: string
}

type PhotonFeature = {
  geometry?: { coordinates?: number[] }
  properties?: {
    osm_type?: string
    osm_id?: number
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
  }
}

const CATEGORIES: Record<string, { radius: number; max: number; include: string[] }> = {
  school: {
    radius: 5000,
    max: 6,
    include: ['osm.amenity.school', 'osm.amenity.college', 'osm.amenity.university', 'osm.amenity.kindergarten'],
  },
  supermarket: {
    radius: 5000,
    max: 6,
    include: ['osm.shop.supermarket', 'osm.shop.grocery', 'osm.shop.convenience'],
  },
  restaurant: {
    radius: 5000,
    max: 6,
    include: ['osm.amenity.restaurant', 'osm.amenity.cafe', 'osm.amenity.fast_food'],
  },
  shopping_mall: {
    radius: 8000,
    max: 6,
    include: ['osm.shop.mall', 'osm.shop.department_store', 'osm.amenity.marketplace'],
  },
  park: {
    radius: 5000,
    max: 6,
    include: ['osm.leisure.park', 'osm.leisure.playground', 'osm.leisure.garden'],
  },
  hospital: {
    radius: 8000,
    max: 6,
    include: ['osm.amenity.hospital', 'osm.amenity.clinic', 'osm.amenity.doctors'],
  },
  pharmacy: {
    radius: 5000,
    max: 6,
    include: ['osm.amenity.pharmacy'],
  },
  transit_station: {
    radius: 5000,
    max: 6,
    include: ['osm.public_transport.station', 'osm.railway.station', 'osm.amenity.bus_station'],
  },
  gas_station: {
    radius: 5000,
    max: 6,
    include: ['osm.amenity.fuel'],
  },
  bank: {
    radius: 5000,
    max: 6,
    include: ['osm.amenity.bank'],
  },
  gym: {
    radius: 5000,
    max: 6,
    include: ['osm.leisure.fitness_centre', 'osm.leisure.sports_centre', 'osm.amenity.gym'],
  },
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatMeters(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatMinutes(minutes: number) {
  if (minutes < 1) return '< 1 min'
  return `${Math.round(minutes)} min`
}

function bboxFor(lat: number, lng: number, radius: number) {
  const dLat = radius / 111320
  const dLng = radius / (111320 * Math.cos((lat * Math.PI) / 180))
  return `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`
}

function addressFromPhoton(props: PhotonFeature['properties']) {
  const street = [props?.housenumber, props?.street].filter(Boolean).join(' ')
  return [street, props?.city || props?.district].filter(Boolean).join(', ')
}

async function fetchCategory(lat: number, lng: number, category: string) {
  const config = CATEGORIES[category]
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('include', config.include.join(','))
  url.searchParams.set('bbox', bboxFor(lat, lng, config.radius))
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('limit', '15')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'property-dashboard/1.0 (https://property-dashboard-three.vercel.app)',
    },
    cache: 'no-store',
  })
  if (!res.ok) return [] as Amenity[]

  const data = (await res.json()) as { features?: PhotonFeature[] }
  const seen = new Set<string>()
  const items: Amenity[] = []

  for (const feature of data.features || []) {
    const props = feature.properties || {}
    const name = props.name?.trim()
    const coords = feature.geometry?.coordinates
    if (!name || !coords || coords.length < 2) continue
    const pointLng = coords[0]
    const pointLat = coords[1]
    if (typeof pointLat !== 'number' || typeof pointLng !== 'number') continue
    const dist = haversine(lat, lng, pointLat, pointLng)
    if (dist > config.radius) continue
    const id = `osm-${props.osm_type || 'n'}-${props.osm_id || `${pointLat},${pointLng}`}`
    if (seen.has(id) || seen.has(name.toLowerCase())) continue
    seen.add(id)
    seen.add(name.toLowerCase())
    items.push({
      place_id: id,
      name,
      address: addressFromPhoton(props),
      lat: pointLat,
      lng: pointLng,
      category,
      straightDist: dist,
      walkDist: formatMeters(dist),
      walkTime: formatMinutes(dist / 83.3),
      driveDist: formatMeters(dist),
      driveTime: formatMinutes(dist / 667),
    })
  }

  return items.sort((a, b) => a.straightDist - b.straightDist).slice(0, config.max)
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const entries = await Promise.all(
    Object.keys(CATEGORIES).map(async (category) => {
      try {
        return [category, await fetchCategory(lat, lng, category)] as const
      } catch {
        return [category, [] as Amenity[]] as const
      }
    })
  )

  const amenities: Record<string, Amenity[]> = {}
  for (const [category, items] of entries) amenities[category] = items

  return NextResponse.json(
    { amenities },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
  )
}
