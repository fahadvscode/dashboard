'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, ExternalLink, Lock, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import {
  GUIDE_CITIES,
  PLACE_TYPES,
  type BrokerProject,
  clearBrokerSession,
  readBrokerSession,
  saveBrokerSession,
} from '@/lib/brokerGuide'

type PlaceForm = {
  key: string
  typeChoice: string
  customType: string
  map_url: string
  cross_streets: string
  address: string
  phone: string
  hours: string
  website: string
  contacts: string
  note: string
}

type PropertyHit = {
  id: string
  project_name: string
  city: string
  builder: string
}

type Screen = 'locked' | 'list' | 'form'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20'

function blankPlace(): PlaceForm {
  return {
    key: crypto.randomUUID(),
    typeChoice: 'Site',
    customType: '',
    map_url: '',
    cross_streets: '',
    address: '',
    phone: '',
    hours: '',
    website: '',
    contacts: '',
    note: '',
  }
}

function placeFromProject(place: BrokerProject['places'][number]): PlaceForm {
  const known = (PLACE_TYPES as readonly string[]).includes(place.place_type)
  return {
    key: place.id,
    typeChoice: known ? place.place_type : 'custom',
    customType: known ? '' : place.place_type,
    map_url: place.map_url ?? '',
    cross_streets: place.cross_streets ?? '',
    address: place.address ?? '',
    phone: place.phone ?? '',
    hours: place.hours ?? '',
    website: place.website ?? '',
    contacts: place.contacts ?? '',
    note: place.note ?? '',
  }
}

function externalHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function PhoneText({ text }: { text: string }) {
  const parts = text.split(/((?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/g)
  return (
    <>
      {parts.map((part, index) => {
        const digits = part.replace(/\D/g, '')
        if (digits.length === 10 || digits.length === 11) {
          return (
            <a key={index} href={`tel:${digits}`} className="font-semibold text-emerald-800 underline underline-offset-2">
              {part}
            </a>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </>
  )
}

async function brokerFetch(path: string, code: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-broker-code': code,
      ...(init?.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) {
    const error = new Error('UNAUTHORIZED')
    throw error
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed') as Error & { setupRequired?: boolean }
    error.setupRequired = Boolean(data.setupRequired)
    throw error
  }
  return data
}

export default function BrokerGuide() {
  const [screen, setScreen] = useState<Screen>('locked')
  const [ready, setReady] = useState(false)
  const [code, setCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const [projects, setProjects] = useState<BrokerProject[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [setupRequired, setSetupRequired] = useState(false)
  const [cityFilter, setCityFilter] = useState('All')
  const [listQuery, setListQuery] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [cityChoice, setCityChoice] = useState<string>(GUIDE_CITIES[0])
  const [customCity, setCustomCity] = useState('')
  const [nameMode, setNameMode] = useState<'search' | 'custom'>('search')
  const [projectName, setProjectName] = useState('')
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHits, setSearchHits] = useState<PropertyHit[]>([])
  const [searching, setSearching] = useState(false)
  const [places, setPlaces] = useState<PlaceForm[]>([blankPlace()])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = readBrokerSession()
    if (saved) {
      setAccessCode(saved)
      setScreen('list')
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (screen === 'list' && accessCode) {
      loadProjects(accessCode)
    }
  }, [screen, accessCode])

  useEffect(() => {
    if (screen !== 'form' || nameMode !== 'search' || propertyId) return
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchHits([])
      return
    }
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true)
        const data = await brokerFetch(`/api/broker-guide/search?q=${encodeURIComponent(query)}`, accessCode)
        setSearchHits(data.results ?? [])
      } catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
          lock()
          return
        }
        setSearchHits([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery, screen, nameMode, propertyId, accessCode])

  async function loadProjects(activeCode: string) {
    try {
      setLoading(true)
      setListError('')
      setSetupRequired(false)
      const data = await brokerFetch('/api/broker-guide', activeCode)
      setProjects(data.projects ?? [])
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        lock()
        return
      }
      const setup = Boolean((error as { setupRequired?: boolean }).setupRequired)
      setSetupRequired(setup)
      setListError(error instanceof Error ? error.message : 'Could not load the guide.')
    } finally {
      setLoading(false)
    }
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault()
    setUnlockError('')
    setUnlocking(true)
    try {
      const response = await fetch('/api/broker-guide/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) {
        setUnlockError('That access code is not right.')
        return
      }
      const accepted = code.trim()
      saveBrokerSession(accepted)
      setAccessCode(accepted)
      setCode('')
      setScreen('list')
    } catch {
      setUnlockError('Could not check the access code. Try again.')
    } finally {
      setUnlocking(false)
    }
  }

  function lock() {
    clearBrokerSession()
    setAccessCode('')
    setScreen('locked')
  }

  function openNew() {
    setEditingId(null)
    setCityChoice(GUIDE_CITIES[0])
    setCustomCity('')
    setNameMode('search')
    setProjectName('')
    setPropertyId(null)
    setSearchQuery('')
    setSearchHits([])
    setPlaces([blankPlace()])
    setFormError('')
    setScreen('form')
  }

  function openEdit(project: BrokerProject) {
    const knownCity = (GUIDE_CITIES as readonly string[]).includes(project.city)
    setEditingId(project.id)
    setCityChoice(knownCity ? project.city : 'other')
    setCustomCity(knownCity ? '' : project.city)
    setNameMode(project.canada_property_id ? 'search' : 'custom')
    setProjectName(project.project_name)
    setPropertyId(project.canada_property_id)
    setSearchQuery('')
    setSearchHits([])
    setPlaces(project.places.length > 0 ? project.places.map(placeFromProject) : [blankPlace()])
    setFormError('')
    setScreen('form')
    window.scrollTo({ top: 0 })
  }

  function updatePlace(key: string, patch: Partial<PlaceForm>) {
    setPlaces((current) => current.map((place) => (place.key === key ? { ...place, ...patch } : place)))
  }

  async function saveProject(event: React.FormEvent) {
    event.preventDefault()
    setFormError('')
    const city = cityChoice === 'other' ? customCity.trim() : cityChoice
    if (!city) {
      setFormError('Choose a city.')
      return
    }
    if (!projectName.trim()) {
      setFormError(nameMode === 'search' ? 'Search and select a project, or switch to a custom name.' : 'Enter a project name.')
      return
    }
    for (const place of places) {
      if (place.typeChoice === 'custom' && !place.customType.trim()) {
        setFormError('Type a custom place type, or pick one from the list.')
        return
      }
    }

    const payload = {
      city,
      project_name: projectName.trim(),
      canada_property_id: nameMode === 'search' ? propertyId : null,
      places: places.map((place) => ({
        place_type: place.typeChoice === 'custom' ? place.customType.trim() : place.typeChoice,
        map_url: place.map_url,
        cross_streets: place.cross_streets,
        address: place.address,
        phone: place.phone,
        hours: place.hours,
        website: place.website,
        contacts: place.contacts,
        note: place.note,
      })),
    }

    try {
      setSaving(true)
      if (editingId) {
        await brokerFetch(`/api/broker-guide/${editingId}`, accessCode, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await brokerFetch('/api/broker-guide', accessCode, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      setScreen('list')
      await loadProjects(accessCode)
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        lock()
        return
      }
      setFormError(error instanceof Error ? error.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  async function removeProject(project: BrokerProject) {
    if (!window.confirm(`Remove ${project.project_name} from the guide?`)) return
    try {
      await brokerFetch(`/api/broker-guide/${project.id}`, accessCode, { method: 'DELETE' })
      await loadProjects(accessCode)
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        lock()
        return
      }
      setListError(error instanceof Error ? error.message : 'Could not remove that project.')
    }
  }

  const visibleProjects = useMemo(() => {
    const query = listQuery.trim().toLowerCase()
    return projects
      .filter((project) => (cityFilter === 'All' ? true : project.city === cityFilter))
      .filter((project) => {
        if (!query) return true
        const haystack = [
          project.project_name,
          project.city,
          ...project.places.flatMap((place) => [place.place_type, place.address, place.cross_streets, place.phone, place.note]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => {
        const cityOrder = (city: string) => {
          const index = GUIDE_CITIES.indexOf(city as (typeof GUIDE_CITIES)[number])
          return index === -1 ? GUIDE_CITIES.length : index
        }
        const cityDiff = cityOrder(a.city) - cityOrder(b.city)
        if (cityDiff !== 0) return cityDiff
        return a.project_name.localeCompare(b.project_name)
      })
  }, [projects, cityFilter, listQuery])

  const cityOptions = useMemo(() => {
    const extras = Array.from(new Set(projects.map((project) => project.city))).filter(
      (city) => !(GUIDE_CITIES as readonly string[]).includes(city)
    )
    return ['All', ...GUIDE_CITIES, ...extras]
  }, [projects])

  const grouped = useMemo(() => {
    const groups: { city: string; projects: BrokerProject[] }[] = []
    for (const project of visibleProjects) {
      const last = groups[groups.length - 1]
      if (!last || last.city !== project.city) groups.push({ city: project.city, projects: [project] })
      else last.projects.push(project)
    }
    return groups
  }, [visibleProjects])

  if (!ready) {
    return <div className="min-h-screen bg-slate-50" />
  }

  if (screen === 'locked') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={unlock} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-center text-2xl font-bold text-slate-900">Broker Guide</h1>
          <p className="mt-2 text-center text-slate-600">Enter the access code to open the site and sales office guide.</p>
          <label className="mt-6 block text-sm font-semibold text-slate-800" htmlFor="broker-code">
            Access code
          </label>
          <input
            id="broker-code"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={`${inputClass} mt-2`}
            placeholder="Access code"
          />
          {unlockError && <p className="mt-2 text-sm text-red-600">{unlockError}</p>}
          <button
            type="submit"
            disabled={unlocking || !code.trim()}
            className="mt-5 w-full rounded-xl bg-emerald-700 py-3.5 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {unlocking ? 'Checking...' : 'Open guide'}
          </button>
        </form>
      </div>
    )
  }

  if (screen === 'form') {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => setScreen('list')} className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Back
            </button>
            <h1 className="flex-1 text-lg font-bold text-slate-900">{editingId ? 'Edit project' : 'Add a project'}</h1>
          </div>
        </header>

        <form onSubmit={saveProject} className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-28">
          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">City</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {GUIDE_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setCityChoice(city)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${cityChoice === city ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
                >
                  {city}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCityChoice('other')}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${cityChoice === 'other' ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
              >
                Other
              </button>
            </div>
            {cityChoice === 'other' && (
              <input
                value={customCity}
                onChange={(event) => setCustomCity(event.target.value)}
                placeholder="Type the city"
                className={`${inputClass} mt-3`}
              />
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Project</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  if (nameMode === 'search') return
                  setNameMode('search')
                  setProjectName('')
                  setPropertyId(null)
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold ${nameMode === 'search' ? 'bg-emerald-700 text-white' : 'border border-slate-300 text-slate-800'}`}
              >
                Pick from current projects
              </button>
              <button
                type="button"
                onClick={() => {
                  setNameMode('custom')
                  setPropertyId(null)
                  setSearchHits([])
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold ${nameMode === 'custom' ? 'bg-emerald-700 text-white' : 'border border-slate-300 text-slate-800'}`}
              >
                Type a custom name
              </button>
            </div>

            {nameMode === 'custom' ? (
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
                className={`${inputClass} mt-4`}
              />
            ) : propertyId ? (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{projectName}</p>
                  <p className="text-sm text-emerald-800">Selected from current projects. Saving here does not change Canada Properties.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPropertyId(null)
                    setProjectName('')
                    setSearchQuery('')
                  }}
                  className="rounded-lg p-1 text-slate-500 hover:bg-white"
                  aria-label="Clear selected project"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search project name"
                    className={`${inputClass} pl-11`}
                  />
                </div>
                {searching && <p className="mt-2 text-sm text-slate-500">Searching...</p>}
                {searchHits.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                    {searchHits.map((hit) => (
                      <li key={hit.id} className="border-b border-slate-100 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => {
                            setProjectName(hit.project_name)
                            setPropertyId(hit.id)
                            setSearchHits([])
                            setSearchQuery('')
                            if ((GUIDE_CITIES as readonly string[]).includes(hit.city)) {
                              setCityChoice(hit.city)
                            }
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <span className="block font-semibold text-slate-900">{hit.project_name}</span>
                          <span className="block text-sm text-slate-500">
                            {[hit.city, hit.builder].filter(Boolean).join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {places.map((place, index) => (
            <section key={place.key} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">Place {index + 1}</h2>
                {places.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPlaces((current) => current.filter((item) => item.key !== place.key))}
                    className="text-sm font-semibold text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Type</p>
                <div className="flex flex-wrap gap-2">
                  {PLACE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updatePlace(place.key, { typeChoice: type })}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${place.typeChoice === type ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updatePlace(place.key, { typeChoice: 'custom' })}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${place.typeChoice === 'custom' ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
                  >
                    Custom
                  </button>
                </div>
                {place.typeChoice === 'custom' && (
                  <input
                    value={place.customType}
                    onChange={(event) => updatePlace(place.key, { customType: event.target.value })}
                    placeholder="Type the place name, such as Presentation centre"
                    className={`${inputClass} mt-3`}
                  />
                )}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Map link</span>
                <input
                  value={place.map_url}
                  onChange={(event) => updatePlace(place.key, { map_url: event.target.value })}
                  placeholder="https://maps.app.goo.gl/..."
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Cross streets</span>
                <input
                  value={place.cross_streets}
                  onChange={(event) => updatePlace(place.key, { cross_streets: event.target.value })}
                  placeholder="Bovaird Dr / Heart Lake Rd"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Address</span>
                <input
                  value={place.address}
                  onChange={(event) => updatePlace(place.key, { address: event.target.value })}
                  placeholder="10194 Heart Lake Road"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Phone</span>
                <textarea
                  value={place.phone}
                  onChange={(event) => updatePlace(place.key, { phone: event.target.value })}
                  placeholder={'647-276-0078\n416-616-1870 Samantha'}
                  rows={2}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Hours</span>
                <textarea
                  value={place.hours}
                  onChange={(event) => updatePlace(place.key, { hours: event.target.value })}
                  placeholder={'Mon–Wed 11am–6pm\nThu & Fri Closed\nSat & Sun 11am–5pm'}
                  rows={4}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Website</span>
                <input
                  value={place.website}
                  onChange={(event) => updatePlace(place.key, { website: event.target.value })}
                  placeholder="southbanks.ca"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Contacts</span>
                <textarea
                  value={place.contacts}
                  onChange={(event) => updatePlace(place.key, { contacts: event.target.value })}
                  placeholder={'Name, direct number, email'}
                  rows={3}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Note</span>
                <textarea
                  value={place.note}
                  onChange={(event) => updatePlace(place.key, { note: event.target.value })}
                  placeholder="Anything else, such as the builders at a shared sales office"
                  rows={2}
                  className={inputClass}
                />
              </label>
            </section>
          ))}

          <button
            type="button"
            onClick={() => setPlaces((current) => [...current, blankPlace()])}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-700 bg-white py-4 text-base font-semibold text-emerald-800"
          >
            <Plus className="h-5 w-5" />
            Add another place
          </button>

          {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}

          <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-2xl">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-emerald-700 py-3.5 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save to guide'}
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">Broker Guide</h1>
            <p className="text-sm text-slate-500">Sites, sales offices, and hours</p>
          </div>
          <button type="button" onClick={lock} className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Lock
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={listQuery}
            onChange={(event) => setListQuery(event.target.value)}
            placeholder="Search the guide"
            className={`${inputClass} pl-11`}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cityOptions.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setCityFilter(city)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${cityFilter === city ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
            >
              {city}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-slate-500">Loading the guide...</p>}
        {listError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p>{listError}</p>
            {setupRequired && (
              <p className="mt-2">
                Open the Supabase SQL editor and run <span className="font-semibold">database/setup_broker_guide.sql</span> once. That file creates a new list only. It does not change Canada Properties.
              </p>
            )}
          </div>
        )}

        {!loading && !listError && grouped.length === 0 && (
          <div className="rounded-2xl bg-white px-5 py-10 text-center border border-slate-200">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">Nothing in the guide yet</p>
            <p className="mt-1 text-sm text-slate-500">Add a project and it will show up here.</p>
          </div>
        )}

        {grouped.map((group) => (
          <section key={group.city} className="space-y-3">
            <h2 className="px-1 text-sm font-bold uppercase tracking-wide text-slate-500">{group.city}</h2>
            {group.projects.map((project) => (
              <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{project.project_name}</h3>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => openEdit(project)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label={`Edit ${project.project_name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeProject(project)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Remove ${project.project_name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {project.places.map((place) => {
                    const mapHref = place.map_url ? externalHref(place.map_url) : ''
                    const siteHref = place.website ? externalHref(place.website) : ''
                    return (
                      <div key={place.id} className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{place.place_type}</p>
                        {mapHref && (
                          <a
                            href={mapHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"
                          >
                            <MapPin className="h-4 w-4" />
                            Open map
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {place.cross_streets && <p className="mt-3 text-sm text-slate-700">{place.cross_streets}</p>}
                        {place.address && <p className="mt-1 text-sm font-medium text-slate-900">{place.address}</p>}
                        {place.phone && (
                          <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
                            <PhoneText text={place.phone} />
                          </p>
                        )}
                        {place.hours && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{place.hours}</p>}
                        {siteHref && (
                          <a href={siteHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 underline underline-offset-2">
                            {place.website}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {place.contacts && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{place.contacts}</p>}
                        {place.note && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{place.note}</p>}
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </section>
        ))}
      </main>
    </div>
  )
}
