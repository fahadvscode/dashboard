'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { loadGoogleMapsScript } from '@/lib/loadGoogleMapsScript'

export type MapCompany = 'fj' | 'precon_factory'

export interface MapProperty {
  id: string
  project_name: string
  address: string
  city: string
  builder?: string
  price?: string
  bedrooms?: string
  bathrooms?: string
  sqft?: string
  pictures?: string
  website_url?: string
  fj_landing_page?: string
  precon_factory_landing_page?: string
  details?: string
  map_address?: string | null
  map_lat?: number | null
  map_lng?: number | null
}

type Props = {
  apiKey: string | undefined
  collectionName: string
  companyLabel: string
  company: MapCompany
  properties: MapProperty[]
}

function buildGeocodeQuery(p: MapProperty): string | null {
  const line = (p.map_address || p.address || '').trim()
  const city = (p.city || '').trim()
  const parts = [line, city, 'Canada'].filter(Boolean)
  const q = parts.join(', ').trim()
  return q || null
}

function geocodePromise(
  geocoder: google.maps.Geocoder,
  address: string
): Promise<google.maps.LatLngLiteral | null> {
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location
        resolve({ lat: loc.lat(), lng: loc.lng() })
      } else resolve(null)
    })
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeHttpUrl(url: string | null | undefined): string | null {
  const u = (url || '').trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  return null
}

function firstImageUrl(pictures: string | null | undefined): string | null {
  if (!pictures?.trim()) return null
  const first = pictures.split(',')[0]?.trim()
  return first && /^https?:\/\//i.test(first) ? first : null
}

function truncateLabel(name: string, max = 20): string {
  const t = name.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function buildHoverCardHtml(p: MapProperty): string {
  const addr = (p.map_address || p.address || '').trim() || 'Address on file'
  const city = (p.city || '').trim()
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 2px;min-width:160px;max-width:260px">
      <div style="font-weight:700;font-size:13px;color:#111827;line-height:1.25">${escapeHtml(p.project_name)}</div>
      <div style="font-size:11px;color:#4b5563;margin-top:6px;line-height:1.35">${escapeHtml(addr)}${city ? `<br/>${escapeHtml(city)}` : ''}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:6px">Click for full details</div>
    </div>`
}

function buildDetailCardHtml(p: MapProperty, company: MapCompany): string {
  const img = firstImageUrl(p.pictures)
  const builder = (p.builder || '').trim()
  const addr = (p.map_address || p.address || '').trim()
  const city = (p.city || '').trim()
  const price = (p.price || '').trim()
  const beds = (p.bedrooms || '').trim()
  const baths = (p.bathrooms || '').trim()
  const sqft = (p.sqft || '').trim()

  const primaryLanding =
    company === 'fj' ? safeHttpUrl(p.fj_landing_page) : safeHttpUrl(p.precon_factory_landing_page)
  const rawSecondary =
    company === 'fj' ? safeHttpUrl(p.precon_factory_landing_page) : safeHttpUrl(p.fj_landing_page)
  const secondaryLanding =
    rawSecondary && rawSecondary !== primaryLanding ? rawSecondary : null
  const websiteRaw = safeHttpUrl(p.website_url)
  const website =
    websiteRaw &&
    websiteRaw !== primaryLanding &&
    websiteRaw !== secondaryLanding
      ? websiteRaw
      : null

  const primaryLabel = company === 'fj' ? 'Open FJ landing page' : 'Open Precon Factory landing page'
  const secondaryLabel = company === 'fj' ? 'Precon Factory page' : 'FJ landing page'

  const stats = [beds && `${beds} bed`, baths && `${baths} bath`, sqft && sqft, price && price !== 'N/A' && price]
    .filter(Boolean)
    .join(' · ')

  const detailsSnippet = (p.details || '').trim()
  const detailsShort =
    detailsSnippet && detailsSnippet !== 'N/A'
      ? detailsSnippet.length > 180
        ? `${escapeHtml(detailsSnippet.slice(0, 180))}…`
        : escapeHtml(detailsSnippet)
      : ''

  const imgBlock = img
    ? `<img src="${escapeHtml(img)}" alt="" style="width:100%;height:130px;object-fit:cover;border-radius:10px;margin-bottom:10px;background:#e5e7eb" onerror="this.style.display='none'"/>`
    : `<div style="height:72px;border-radius:10px;background:linear-gradient(135deg,#e0e7ff,#fce7f3);margin-bottom:10px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#6b7280">No image</div>`

  const btnPrimary =
    primaryLanding != null
      ? `<a href="${escapeHtml(primaryLanding)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:600;color:#fff;text-decoration:none;background:${company === 'fj' ? 'linear-gradient(90deg,#2563eb,#1d4ed8)' : 'linear-gradient(90deg,#9333ea,#db2777)'};margin-bottom:8px">${primaryLabel}</a>`
      : ''

  const btnSecondary =
    secondaryLanding != null
      ? `<a href="${escapeHtml(secondaryLanding)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:600;color:#374151;text-decoration:none;border:1px solid #d1d5db;margin-bottom:8px">${secondaryLabel}</a>`
      : ''

  const btnWeb =
    website != null
      ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:600;color:#1d4ed8;text-decoration:none">Project website</a>`
      : ''

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;padding:4px 2px 8px;max-width:300px">
      ${imgBlock}
      <div style="font-weight:800;font-size:15px;color:#111827;line-height:1.25">${escapeHtml(p.project_name)}</div>
      ${builder ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${escapeHtml(builder)}</div>` : ''}
      ${addr || city ? `<div style="font-size:11px;color:#4b5563;margin-top:8px;line-height:1.4">${escapeHtml(addr)}${city ? `<br/>${escapeHtml(city)}` : ''}</div>` : ''}
      ${stats ? `<div style="font-size:11px;color:#111827;margin-top:8px;font-weight:600">${escapeHtml(stats)}</div>` : ''}
      ${detailsShort ? `<div style="font-size:11px;color:#6b7280;margin-top:8px;line-height:1.45">${detailsShort}</div>` : ''}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb">
        ${btnPrimary}${btnSecondary}${btnWeb}
      </div>
    </div>`
}

export default function CollectionsMapPanel({
  apiKey,
  collectionName,
  companyLabel,
  company,
  properties,
}: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const hoverInfoRef = useRef<google.maps.InfoWindow | null>(null)
  const detailInfoRef = useRef<google.maps.InfoWindow | null>(null)
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [scriptReady, setScriptReady] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [positions, setPositions] = useState<Record<string, google.maps.LatLngLiteral>>({})
  const [geocodeErrors, setGeocodeErrors] = useState<string[]>([])

  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!cancelled) setScriptReady(true)
      })
      .catch(() => {
        if (!cancelled) setScriptReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  useEffect(() => {
    if (!scriptReady || !mapDivRef.current || typeof window === 'undefined' || !window.google?.maps) return

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: 43.6532, lng: -79.3832 },
      zoom: 9,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    })

    hoverInfoRef.current = new google.maps.InfoWindow({
      disableAutoPan: true,
      maxWidth: 280,
      pixelOffset: new google.maps.Size(0, -6),
    })
    detailInfoRef.current = new google.maps.InfoWindow({
      maxWidth: 340,
      pixelOffset: new google.maps.Size(0, -4),
    })

    const map = mapRef.current
    map.addListener('click', () => {
      detailInfoRef.current?.close()
    })

    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current)
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      hoverInfoRef.current?.close()
      detailInfoRef.current?.close()
      hoverInfoRef.current = null
      detailInfoRef.current = null
      mapRef.current = null
    }
  }, [scriptReady])

  useEffect(() => {
    if (!scriptReady || !window.google?.maps) return

    const geocoder = new google.maps.Geocoder()
    let cancelled = false

    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      setGeocoding(true)
      setGeocodeErrors([])

      const next: Record<string, google.maps.LatLngLiteral> = {}
      const errs: string[] = []

      for (const p of properties) {
        if (cancelled) return
        if (p.map_lat != null && p.map_lng != null) {
          next[p.id] = { lat: Number(p.map_lat), lng: Number(p.map_lng) }
          continue
        }
        const q = buildGeocodeQuery(p)
        if (!q) {
          errs.push(p.project_name)
          continue
        }
        await new Promise((r) => setTimeout(r, 200))
        const loc = await geocodePromise(geocoder, q)
        if (cancelled) return
        if (loc) next[p.id] = loc
        else errs.push(p.project_name)
      }

      if (!cancelled) {
        setPositions(next)
        setGeocodeErrors(errs)
        setGeocoding(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [scriptReady, properties])

  useEffect(() => {
    if (!scriptReady || !mapRef.current || !window.google?.maps) return

    const hoverInfo = hoverInfoRef.current
    const detailInfo = detailInfoRef.current
    if (!hoverInfo || !detailInfo) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const map = mapRef.current
    const bounds = new google.maps.LatLngBounds()
    let any = false

    const scheduleHoverClose = () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current)
      hoverCloseTimerRef.current = setTimeout(() => {
        hoverInfo.close()
        hoverCloseTimerRef.current = null
      }, 220)
    }

    const cancelHoverClose = () => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current)
        hoverCloseTimerRef.current = null
      }
    }

    for (const p of properties) {
      const pos = positions[p.id]
      if (!pos) continue
      any = true
      bounds.extend(pos)

      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: p.project_name,
        label: {
          text: truncateLabel(p.project_name, 22),
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: '600',
          className: 'collections-map-marker-label',
        },
      })

      marker.addListener('mouseover', () => {
        cancelHoverClose()
        hoverInfo.setContent(buildHoverCardHtml(p))
        hoverInfo.open({ map, anchor: marker })
      })

      marker.addListener('mouseout', () => {
        scheduleHoverClose()
      })

      marker.addListener('click', () => {
        cancelHoverClose()
        hoverInfo.close()
        detailInfo.setContent(buildDetailCardHtml(p, company))
        detailInfo.open({ map, anchor: marker })
      })

      markersRef.current.push(marker)
    }

    if (any && !bounds.isEmpty()) {
      map.fitBounds(bounds, 48)
      google.maps.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom()
        if (z != null && z > 15) map.setZoom(15)
      })
    }
  }, [scriptReady, properties, positions, company])

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-sm">
        <p className="font-semibold">Google Maps API key missing</p>
        <p className="mt-2 text-amber-800">
          Add <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and restart the dev server. Enable the{' '}
          <strong>Maps JavaScript API</strong> and <strong>Geocoding API</strong> for that key.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{collectionName}</p>
            <p className="text-xs text-gray-500">
              {companyLabel} · {properties.length} project(s) · hover for preview, click for details
            </p>
          </div>
        </div>
        {geocoding && (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Placing pins…
          </span>
        )}
      </div>

      <div ref={mapDivRef} className="w-full h-[min(520px,70vh)] bg-gray-100" />

      {geocodeErrors.length > 0 && (
        <div className="px-4 py-3 text-xs text-amber-800 bg-amber-50 border-t border-amber-100">
          Could not place a pin for: {geocodeErrors.join(', ')}. Add a map address on the project card and save.
        </div>
      )}
    </div>
  )
}
