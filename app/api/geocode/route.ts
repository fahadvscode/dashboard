import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'ca')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'property-dashboard/1.0 (https://property-dashboard-three.vercel.app)',
    },
    cache: 'force-cache',
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Geocode failed' }, { status: 502 })
  }

  const data = (await res.json()) as Array<{ lat?: string; lon?: string }>
  const first = data[0]
  const lat = first?.lat ? Number(first.lat) : NaN
  const lng = first?.lon ? Number(first.lon) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ lat: null, lng: null })
  }

  return NextResponse.json({ lat, lng })
}
