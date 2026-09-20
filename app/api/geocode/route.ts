import { NextRequest, NextResponse } from 'next/server'

type NominatimHit = { lat?: string; lon?: string }
type PhotonHit = {
  features?: Array<{ geometry?: { coordinates?: number[] } }>
}

function addQuery(list: string[], value: string) {
  const next = value.replace(/\s+/g, ' ').trim()
  if (next && !list.includes(next)) list.push(next)
}

function expandAbbreviations(value: string) {
  return value
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\bPkwy\b/gi, 'Parkway')
    .replace(/\bAve\b/gi, 'Avenue')
    .replace(/\bBlvd\b/gi, 'Boulevard')
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bDr\b/gi, 'Drive')
    .replace(/\bSt\b/gi, 'Street')
    .replace(/\bCrt\b/gi, 'Court')
    .replace(/\bCir\b/gi, 'Circle')
    .replace(/,?\s+\bS\b/g, ' South')
    .replace(/,?\s+\bN\b/g, ' North')
    .replace(/,?\s+\bE\b/g, ' East')
    .replace(/,?\s+\bW\b/g, ' West')
}

function buildQueries(input: string): string[] {
  const queries: string[] = []
  addQuery(queries, input)
  addQuery(queries, input.replace(/\s*&\s*/g, ' and '))
  addQuery(queries, expandAbbreviations(input))
  addQuery(queries, expandAbbreviations(input).replace(/,\s*([^,]+),\s*\1\b/gi, ', $1'))
  addQuery(queries, expandAbbreviations(input).replace(/, Canada$/i, ', Ontario, Canada'))

  const parts = input.split(',').map((part) => part.trim()).filter(Boolean)
  const street = expandAbbreviations(parts[0] || '')
  const city =
    parts.find((part, index) => index > 0 && !/^(canada|on|ontario)$/i.test(part)) || ''
  if (street && city) {
    addQuery(queries, `${street}, ${city}, Ontario, Canada`)
    for (const side of street.split(/\s+and\s+/i)) {
      addQuery(queries, `${side.trim()}, ${city}, Ontario, Canada`)
    }
  }
  return queries.slice(0, 8)
}

function parseNominatim(data: NominatimHit[]): { lat: number; lng: number } | null {
  const first = data[0]
  const lat = first?.lat ? Number(first.lat) : NaN
  const lng = first?.lon ? Number(first.lon) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

async function searchNominatim(query: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'ca')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'property-dashboard/1.0 (https://property-dashboard-three.vercel.app)',
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return parseNominatim((await res.json()) as NominatimHit[])
}

async function searchPhoton(query: string) {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = (await res.json()) as PhotonHit
  const coords = data.features?.[0]?.geometry?.coordinates
  const lng = coords?.[0]
  const lat = coords?.[1]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  for (const [index, query] of buildQueries(q).entries()) {
    try {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 150))
      const hit = await searchNominatim(query)
      if (hit) return NextResponse.json(hit)
    } catch {
      // try next variant
    }
  }

  try {
    const photon = await searchPhoton(expandAbbreviations(q))
    if (photon) return NextResponse.json(photon)
  } catch {
    // fall through
  }

  return NextResponse.json({ lat: null, lng: null })
}
