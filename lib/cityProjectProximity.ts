export type LatLng = { lat: number; lng: number }

export type NearbyPlace = {
  name: string
  meters: number
}

export type ProjectProximity = {
  go: NearbyPlace | null
  highway: NearbyPlace | null
  school: NearbyPlace | null
  grocery: NearbyPlace | null
  hospital: NearbyPlace | null
  park: NearbyPlace | null
}

export const PROXIMITY_FILTERS = [
  { id: 'go', label: 'Near a GO station', hint: 'Within 2 km', maxMeters: 2000 },
  { id: 'highway', label: 'Near a highway', hint: 'Within 6 km of the 401, 400, 403, 404, 407, 410, 427, or the QEW', maxMeters: 6000 },
  { id: 'school', label: 'Near a school', hint: 'Within 1.5 km', maxMeters: 1500 },
  { id: 'grocery', label: 'Near grocery', hint: 'Within 1.5 km', maxMeters: 1500 },
  { id: 'park', label: 'Near a park', hint: 'Within 1.2 km', maxMeters: 1200 },
  { id: 'hospital', label: 'Near a hospital', hint: 'Within 8 km', maxMeters: 8000 },
] as const

export type ProximityFilterId = (typeof PROXIMITY_FILTERS)[number]['id']

type HighwayDef = {
  name: string
  short: string
  points: LatLng[]
}

const GTA_HIGHWAYS: HighwayDef[] = [
  { name: 'Highway 401', short: '401', points: [
    { lat: 42.317, lng: -83.037 }, { lat: 42.985, lng: -81.246 }, { lat: 43.361, lng: -80.314 },
    { lat: 43.478, lng: -80.02 }, { lat: 43.523, lng: -79.883 }, { lat: 43.575, lng: -79.74 },
    { lat: 43.632, lng: -79.62 }, { lat: 43.668, lng: -79.545 }, { lat: 43.713, lng: -79.515 },
    { lat: 43.75, lng: -79.33 }, { lat: 43.79, lng: -79.2 }, { lat: 43.835, lng: -79.09 },
    { lat: 43.9, lng: -78.85 }, { lat: 44.234, lng: -76.95 }, { lat: 44.231, lng: -76.486 },
  ] },
  { name: 'Highway 400', short: '400', points: [
    { lat: 43.713, lng: -79.516 }, { lat: 43.8, lng: -79.52 }, { lat: 43.86, lng: -79.51 },
    { lat: 44.05, lng: -79.48 }, { lat: 44.23, lng: -79.466 }, { lat: 44.619, lng: -79.949 },
  ] },
  { name: 'Highway 404', short: '404', points: [
    { lat: 43.77, lng: -79.34 }, { lat: 43.85, lng: -79.36 }, { lat: 43.95, lng: -79.41 }, { lat: 44.08, lng: -79.46 },
  ] },
  { name: 'Highway 407', short: '407', points: [
    { lat: 43.365, lng: -79.8 }, { lat: 43.5, lng: -79.72 }, { lat: 43.55, lng: -79.68 },
    { lat: 43.6, lng: -79.64 }, { lat: 43.65, lng: -79.58 }, { lat: 43.78, lng: -79.52 },
    { lat: 43.85, lng: -79.37 }, { lat: 43.87, lng: -79.28 }, { lat: 43.89, lng: -79.1 }, { lat: 43.93, lng: -78.85 },
  ] },
  { name: 'Highway 403', short: '403', points: [
    { lat: 43.135, lng: -80.263 }, { lat: 43.16, lng: -80.05 }, { lat: 43.24, lng: -79.87 },
    { lat: 43.36, lng: -79.79 }, { lat: 43.48, lng: -79.67 }, { lat: 43.55, lng: -79.65 }, { lat: 43.63, lng: -79.65 },
  ] },
  { name: 'Highway 410', short: '410', points: [
    { lat: 43.655, lng: -79.63 }, { lat: 43.7, lng: -79.66 }, { lat: 43.74, lng: -79.7 }, { lat: 43.796, lng: -79.744 },
  ] },
  { name: 'Highway 427', short: '427', points: [
    { lat: 43.596, lng: -79.544 }, { lat: 43.68, lng: -79.57 }, { lat: 43.812, lng: -79.59 },
  ] },
  { name: 'QEW', short: 'QEW', points: [
    { lat: 42.906, lng: -79.046 }, { lat: 43.169, lng: -79.247 }, { lat: 43.25, lng: -79.85 },
    { lat: 43.35, lng: -79.8 }, { lat: 43.45, lng: -79.67 }, { lat: 43.55, lng: -79.58 }, { lat: 43.637, lng: -79.42 },
  ] },
]

/** Fallback if the live station search is unavailable. Coordinates are the station buildings. */
const GO_STATIONS: Array<{ name: string } & LatLng> = [
  { name: 'Milton GO', lat: 43.5235, lng: -79.8672 },
  { name: 'Lisgar GO', lat: 43.5904, lng: -79.7884 },
  { name: 'Meadowvale GO', lat: 43.5977, lng: -79.7538 },
  { name: 'Streetsville GO', lat: 43.5755, lng: -79.7128 },
  { name: 'Erindale GO', lat: 43.5448, lng: -79.6678 },
  { name: 'Cooksville GO', lat: 43.5834, lng: -79.6237 },
  { name: 'Dixie GO', lat: 43.6084, lng: -79.5776 },
  { name: 'Kipling GO', lat: 43.6356, lng: -79.537 },
  { name: 'Union Station', lat: 43.6452, lng: -79.3806 },
  { name: 'Port Credit GO', lat: 43.5555, lng: -79.5874 },
  { name: 'Clarkson GO', lat: 43.5127, lng: -79.6344 },
  { name: 'Oakville GO', lat: 43.4546, lng: -79.6824 },
  { name: 'Bronte GO', lat: 43.3937, lng: -79.7176 },
  { name: 'Burlington GO', lat: 43.3412, lng: -79.8094 },
  { name: 'Aldershot GO', lat: 43.3132, lng: -79.8555 },
  { name: 'Hamilton GO Centre', lat: 43.2532, lng: -79.8695 },
  { name: 'Brampton GO', lat: 43.6868, lng: -79.7646 },
  { name: 'Bramalea GO', lat: 43.7017, lng: -79.6911 },
  { name: 'Mount Pleasant GO', lat: 43.6755, lng: -79.8228 },
  { name: 'Georgetown GO', lat: 43.6554, lng: -79.9183 },
  { name: 'Malton GO', lat: 43.7052, lng: -79.6355 },
  { name: 'Pickering GO', lat: 43.8313, lng: -79.0855 },
  { name: 'Ajax GO', lat: 43.848, lng: -79.0415 },
  { name: 'Whitby GO', lat: 43.8655, lng: -78.9382 },
  { name: 'Oshawa GO', lat: 43.8705, lng: -78.8851 },
  { name: 'Maple GO', lat: 43.8595, lng: -79.5076 },
  { name: 'Richmond Hill GO', lat: 43.8746, lng: -79.4265 },
  { name: 'Unionville GO', lat: 43.8515, lng: -79.3155 },
  { name: 'Markham GO', lat: 43.8827, lng: -79.2626 },
  { name: 'Aurora GO', lat: 44.0002, lng: -79.46 },
  { name: 'Barrie South GO', lat: 44.3513, lng: -79.6905 },
]

export function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function closestOnSegment(point: LatLng, start: LatLng, end: LatLng): LatLng {
  const dx = end.lat - start.lat
  const dy = end.lng - start.lng
  const lenSq = dx * dx + dy * dy
  let t = lenSq > 0 ? ((point.lat - start.lat) * dx + (point.lng - start.lng) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  return { lat: start.lat + t * dx, lng: start.lng + t * dy }
}

export function highwayPaths() {
  return GTA_HIGHWAYS.map((highway) => ({ name: highway.short, points: highway.points }))
}

export function nearestHighway(point: LatLng): NearbyPlace | null {
  let best: NearbyPlace | null = null
  for (const highway of GTA_HIGHWAYS) {
    for (let i = 0; i < highway.points.length - 1; i++) {
      const closest = closestOnSegment(point, highway.points[i], highway.points[i + 1])
      const meters = haversineMeters(point, closest)
      if (!best || meters < best.meters) best = { name: highway.short, meters }
    }
  }
  return best
}

export function nearestPlace(point: LatLng, places: Array<{ name: string } & LatLng>): NearbyPlace | null {
  let best: NearbyPlace | null = null
  for (const place of places) {
    const meters = haversineMeters(point, place)
    if (!best || meters < best.meters) best = { name: place.name, meters }
  }
  return best
}

export function formatKm(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function bboxAround(points: LatLng[], padMeters: number) {
  const lats = points.map((point) => point.lat)
  const lngs = points.map((point) => point.lng)
  const latPad = padMeters / 111320
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const lngPad = padMeters / (111320 * Math.cos((midLat * Math.PI) / 180))
  return {
    minLat: Math.min(...lats) - latPad,
    maxLat: Math.max(...lats) + latPad,
    minLng: Math.min(...lngs) - lngPad,
    maxLng: Math.max(...lngs) + lngPad,
    center: { lat: midLat, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 },
  }
}

type PhotonFeature = {
  geometry?: { coordinates?: number[] }
  properties?: { name?: string }
}

async function photonInBox(include: string[], box: ReturnType<typeof bboxAround>) {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('include', include.join(','))
  url.searchParams.set('bbox', `${box.minLng},${box.minLat},${box.maxLng},${box.maxLat}`)
  url.searchParams.set('lat', String(box.center.lat))
  url.searchParams.set('lon', String(box.center.lng))
  url.searchParams.set('limit', '40')
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': 'property-dashboard/1.0' },
    cache: 'no-store',
  })
  if (!res.ok) return [] as Array<{ name: string } & LatLng>
  const data = (await res.json()) as { features?: PhotonFeature[] }
  const places: Array<{ name: string } & LatLng> = []
  const seen = new Set<string>()
  for (const feature of data.features || []) {
    const name = feature.properties?.name?.trim()
    const coords = feature.geometry?.coordinates
    if (!name || !coords || coords.length < 2) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    places.push({ name, lng: coords[0], lat: coords[1] })
  }
  return places
}

let goStationCache: Array<{ name: string } & LatLng> | null = null

export async function loadGoStations(): Promise<Array<{ name: string } & LatLng>> {
  if (goStationCache) return goStationCache
  try {
    const query = `[out:json][timeout:18];node["railway"="station"]["name"~"GO",i](42.7,-80.8,44.7,-78.0);out body;`
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(14000),
    })
    if (res.ok) {
      const data = (await res.json()) as { elements?: Array<{ lat?: number; lon?: number; tags?: { name?: string } }> }
      const stations = (data.elements || [])
        .map((item) => {
          const name = item.tags?.name?.trim() || ''
          if (!name || typeof item.lat !== 'number' || typeof item.lon !== 'number') return null
          if (!/\bGO\b/i.test(name) && !/go station/i.test(name)) return null
          return { name, lat: item.lat, lng: item.lon }
        })
        .filter((item): item is { name: string } & LatLng => Boolean(item))
      if (stations.length >= 8) {
        const names = new Set(stations.map((station) => station.name.toLowerCase()))
        for (const extra of GO_STATIONS) {
          if (!names.has(extra.name.toLowerCase())) stations.push(extra)
        }
        goStationCache = stations
        return stations
      }
    }
  } catch {
    // Use the built-in list.
  }
  goStationCache = GO_STATIONS
  return GO_STATIONS
}

export async function loadAreaPlaces(points: LatLng[]) {
  if (points.length === 0) {
    return { schools: [], groceries: [], hospitals: [], parks: [], goStations: GO_STATIONS }
  }
  const box = bboxAround(points, 4000)
  const [schools, groceries, hospitals, parks, goStations] = await Promise.all([
    photonInBox(['osm.amenity.school', 'osm.amenity.college', 'osm.amenity.university'], box).catch(() => []),
    photonInBox(['osm.shop.supermarket', 'osm.shop.grocery'], box).catch(() => []),
    photonInBox(['osm.amenity.hospital'], box).catch(() => []),
    photonInBox(['osm.leisure.park'], box).catch(() => []),
    loadGoStations(),
  ])
  return { schools, groceries, hospitals, parks, goStations }
}

export function proximityFor(point: LatLng, places: Awaited<ReturnType<typeof loadAreaPlaces>>): ProjectProximity {
  return {
    go: nearestPlace(point, places.goStations),
    highway: nearestHighway(point),
    school: nearestPlace(point, places.schools),
    grocery: nearestPlace(point, places.groceries),
    hospital: nearestPlace(point, places.hospitals),
    park: nearestPlace(point, places.parks),
  }
}

export function matchesFilters(proximity: ProjectProximity, filters: ProximityFilterId[]) {
  if (filters.length === 0) return true
  return filters.every((id) => {
    const rule = PROXIMITY_FILTERS.find((item) => item.id === id)
    const place = proximity[id]
    return Boolean(rule && place && place.meters <= rule.maxMeters)
  })
}
