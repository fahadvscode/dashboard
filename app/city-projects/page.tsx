'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin, TrainFront, School, Route, ShoppingCart, Trees, Hospital } from 'lucide-react'
import CityProjectsMap, { type CityMapPlace } from '@/components/CityProjectsMap'
import { getFirstPropertyImage } from '@/lib/propertyImages'
import {
  PROXIMITY_FILTERS,
  formatKm,
  matchesFilters,
  type ProximityFilterId,
  type ProjectProximity,
} from '@/lib/cityProjectProximity'

type CityProject = {
  id: string
  project_name: string
  address: string
  city: string
  builder: string
  price: string
  bedrooms: string
  bathrooms: string
  pictures: string
  lat: number
  lng: number
  proximity: ProjectProximity
}

const FILTER_ICONS = {
  go: TrainFront,
  highway: Route,
  school: School,
  grocery: ShoppingCart,
  park: Trees,
  hospital: Hospital,
} as const

const PROXIMITY_ROWS: Array<{ id: keyof ProjectProximity; label: string }> = [
  { id: 'go', label: 'GO' },
  { id: 'highway', label: 'Highway' },
  { id: 'school', label: 'School' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'park', label: 'Park' },
  { id: 'hospital', label: 'Hospital' },
]

export default function CityProjectsPage() {
  const [cities, setCities] = useState<string[]>([])
  const [cityQuery, setCityQuery] = useState('')
  const [city, setCity] = useState('')
  const [filters, setFilters] = useState<ProximityFilterId[]>([])
  const [projects, setProjects] = useState<CityProject[]>([])
  const [places, setPlaces] = useState<Partial<Record<ProximityFilterId, CityMapPlace[]>>>({})
  const [total, setTotal] = useState(0)
  const [loadingCities, setLoadingCities] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects/city-map')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not load cities')
        return data.cities as string[]
      })
      .then((list) => {
        if (!cancelled) setCities(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load cities')
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!city) {
      setProjects([])
      setPlaces({})
      setTotal(0)
      setSelectedId(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    setSelectedId(null)
    fetch(`/api/projects/city-map?city=${encodeURIComponent(city)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not load projects')
        return data as { projects: CityProject[]; places: Partial<Record<ProximityFilterId, CityMapPlace[]>>; total: number }
      })
      .then((data) => {
        if (cancelled) return
        setProjects(data.projects || [])
        setPlaces(data.places || {})
        setTotal(data.total || 0)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load projects')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [city])

  const cityOptions = useMemo(() => {
    const query = cityQuery.trim().toLowerCase()
    const filtered = query ? cities.filter((name) => name.toLowerCase().includes(query)) : cities
    if (city && !filtered.includes(city)) return [city, ...filtered]
    return filtered
  }, [cities, cityQuery, city])

  const visible = useMemo(
    () => projects.filter((project) => matchesFilters(project.proximity, filters)),
    [projects, filters]
  )

  function toggleFilter(id: ProximityFilterId) {
    setFilters((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Buyer map</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">City project map</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Pick a city, then keep the projects that sit near a GO station, a highway, a school, or everyday stops a buyer asks about.
          </p>
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[240px_1fr]">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">City</label>
            <input
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder={loadingCities ? 'Loading cities…' : 'Search cities'}
              className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
            >
              <option value="">Select a city</option>
              {cityOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Filters — a project must match every one you turn on
            </p>
            <div className="flex flex-wrap gap-2">
              {PROXIMITY_FILTERS.map((filter) => {
                const Icon = FILTER_ICONS[filter.id]
                const on = filters.includes(filter.id)
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => toggleFilter(filter.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                      on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                    title={filter.hint}
                  >
                    <Icon className="h-4 w-4" />
                    {filter.label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Amber dots are projects. Turn on a filter to drop the ones that are too far, and to show GO stations, schools, grocery, parks, or hospitals on the map. Highways draw as amber lines.
            </p>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="order-2 max-h-[78vh] space-y-3 overflow-auto lg:order-1">
            <p className="text-sm text-gray-600">
              {loading
                ? 'Placing projects on the map…'
                : city
                  ? `${visible.length} of ${projects.length} mapped${total > projects.length ? ` (${total} in this city)` : ''}`
                  : 'Select a city to see its projects.'}
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking GO stations, highways, schools, and nearby stops
              </div>
            )}
            {!loading && city && visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
                No projects in {city} match these filters. Turn one off to widen the list.
              </div>
            )}
            {visible.map((project) => {
              const image = getFirstPropertyImage(project.pictures)
              const selected = project.id === selectedId
              return (
                <article
                  key={project.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${selected ? 'border-gray-900' : 'border-gray-200'}`}
                >
                  <button type="button" onClick={() => setSelectedId(project.id)} className="flex w-full gap-3 p-3 text-left">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{project.project_name}</p>
                      <p className="truncate text-xs text-gray-500">{project.builder || project.address}</p>
                      {project.price && <p className="mt-1 text-sm text-gray-800">{project.price}</p>}
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                    {PROXIMITY_ROWS.map((row) => {
                      const place = project.proximity[row.id]
                      if (!place) return null
                      const rule = PROXIMITY_FILTERS.find((item) => item.id === row.id)
                      const near = Boolean(rule && place.meters <= rule.maxMeters)
                      return (
                        <span
                          key={row.id}
                          className={`rounded-full px-2 py-0.5 text-[11px] ${near ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}
                          title={place.name}
                        >
                          {row.label} {formatKm(place.meters)}
                        </span>
                      )
                    })}
                  </div>
                  <div className="border-t border-gray-100 px-3 py-2">
                    <Link href={`/project-presentation?id=${project.id}`} className="text-sm font-medium text-amber-800 hover:underline">
                      Open presentation
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
          <div className="order-1 min-h-[420px] lg:order-2 lg:sticky lg:top-4 lg:h-[78vh]">
            <CityProjectsMap
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              projects={visible}
              places={places}
              activeFilters={filters}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
