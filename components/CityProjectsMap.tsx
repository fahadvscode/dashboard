'use client'

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsScript } from '@/lib/loadGoogleMapsScript'
import { highwayPaths, type ProximityFilterId } from '@/lib/cityProjectProximity'

export type CityMapProject = {
  id: string
  project_name: string
  lat: number
  lng: number
}

export type CityMapPlace = {
  name: string
  lat: number
  lng: number
}

const PLACE_STYLE: Record<Exclude<ProximityFilterId, 'highway'>, { color: string; letter: string }> = {
  go: { color: '#4f46e5', letter: 'GO' },
  school: { color: '#059669', letter: 'S' },
  grocery: { color: '#d97706', letter: 'G' },
  park: { color: '#16a34a', letter: 'P' },
  hospital: { color: '#dc2626', letter: 'H' },
}

function pin(color: string, letter: string, scale: number) {
  const width = letter.length > 1 ? 36 : 26
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34" viewBox="0 0 ${width} 34"><path fill="${color}" d="M${width / 2} 33c8-8 14-14 14-20a14 14 0 1 0-28 0c0 6 6 12 14 20z"/><text x="${width / 2}" y="16" text-anchor="middle" font-size="10" font-family="Arial" font-weight="700" fill="white">${letter}</text></svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width * scale, 34 * scale),
    anchor: new google.maps.Point((width * scale) / 2, 34 * scale),
  }
}

export default function CityProjectsMap({
  apiKey,
  projects,
  places,
  activeFilters,
  selectedId,
  onSelect,
}: {
  apiKey?: string
  projects: CityMapProject[]
  places: Partial<Record<ProximityFilterId, CityMapPlace[]>>
  activeFilters: ProximityFilterId[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const linesRef = useRef<google.maps.Polyline[]>([])
  const fittedKey = useRef('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!apiKey || !mapDiv.current) return
    let cancelled = false
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapDiv.current || mapRef.current) return
        mapRef.current = new google.maps.Map(mapDiv.current, {
          center: { lat: 43.65, lng: -79.38 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })
        setReady(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Map failed to load')
      })
    return () => {
      cancelled = true
    }
  }, [apiKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    linesRef.current.forEach((line) => line.setMap(null))
    linesRef.current = []

    const bounds = new google.maps.LatLngBounds()
    let count = 0

    const info = new google.maps.InfoWindow()
    for (const project of projects) {
      const selected = project.id === selectedId
      const marker = new google.maps.Marker({
        map,
        position: { lat: project.lat, lng: project.lng },
        title: project.project_name,
        zIndex: selected ? 500 : 200,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selected ? 11 : 8,
          fillColor: selected ? '#111827' : '#b45309',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      marker.addListener('click', () => {
        onSelect(project.id)
        const name = project.project_name.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
        info.setContent(
          `<div style="font-family:system-ui,sans-serif;padding:4px 2px;max-width:220px"><div style="font-weight:700">${name}</div><a href="/project-presentation?id=${encodeURIComponent(project.id)}" style="color:#b45309;font-size:13px">Open presentation</a></div>`
        )
        info.open({ map, anchor: marker })
      })
      markersRef.current.push(marker)
      bounds.extend({ lat: project.lat, lng: project.lng })
      count += 1
    }

    for (const filter of activeFilters) {
      if (filter === 'highway') {
        for (const highway of highwayPaths()) {
          const line = new google.maps.Polyline({
            map,
            path: highway.points,
            strokeColor: '#f59e0b',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            zIndex: 20,
          })
          linesRef.current.push(line)
        }
        continue
      }
      const style = PLACE_STYLE[filter]
      for (const place of places[filter] || []) {
        const marker = new google.maps.Marker({
          map,
          position: { lat: place.lat, lng: place.lng },
          title: place.name,
          zIndex: 80,
          icon: pin(style.color, style.letter, 0.9),
        })
        markersRef.current.push(marker)
      }
    }

    const fitKey = projects.map((project) => project.id).join(',')
    if (count > 0 && fittedKey.current !== fitKey) {
      fittedKey.current = fitKey
      if (count === 1) {
        map.setCenter({ lat: projects[0].lat, lng: projects[0].lng })
        map.setZoom(13)
      } else {
        map.fitBounds(bounds, 48)
      }
    }
  }, [ready, projects, places, activeFilters, selectedId, onSelect])

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Add a Google Maps key to show the map. The project list still works.
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
      <div ref={mapDiv} className="h-full min-h-[420px] w-full" />
      {error && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-white px-3 py-2 text-sm text-red-700 shadow">
          {error}
        </div>
      )}
    </div>
  )
}
