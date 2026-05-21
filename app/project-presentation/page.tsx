'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search,
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  DollarSign,
  Building2,
  Loader2,
  MapPinned,
  X,
  Presentation,
} from 'lucide-react'
import PresentationMapView, { type PresentationProperty } from '@/components/PresentationMapView'

interface Property extends PresentationProperty {
  details: string
  features: string
  quick_facts: string
  website_url: string
  fj_landing_page: string
  precon_factory_landing_page: string
}

export default function ProjectPresentationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [bedsFilter, setBedsFilter] = useState('')
  const [bathsFilter, setBathsFilter] = useState('')
  const [results, setResults] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Property | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    fetchCities()
  }, [])

  async function fetchCities() {
    try {
      const { data } = await supabase
        .from('canada_properties')
        .select('city')
        .not('city', 'is', null)
        .not('city', 'eq', '')
      if (data) {
        const unique = [...new Set(data.map((d: { city: string }) => d.city?.trim()).filter(Boolean))]
        unique.sort()
        setCities(unique)
      }
    } catch (err) {
      console.error('Error fetching cities:', err)
    }
  }

  const searchProjects = useCallback(async () => {
    const hasQuery = searchQuery.trim().length >= 2
    const hasFilters = cityFilter || bedsFilter || bathsFilter
    if (!hasQuery && !hasFilters) {
      setResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      let query = supabase.from('canada_properties').select('*')

      if (searchQuery.trim().length >= 2) {
        const q = searchQuery.trim()
        query = query.or(
          `project_name.ilike.%${q}%,builder.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%,id.ilike.%${q}%`
        )
      }

      if (cityFilter) {
        query = query.ilike('city', cityFilter)
      }
      if (bedsFilter) {
        query = query.ilike('bedrooms', `%${bedsFilter}%`)
      }
      if (bathsFilter) {
        query = query.ilike('bathrooms', `%${bathsFilter}%`)
      }

      const { data, error } = await query.limit(30)

      if (error) throw error
      setResults((data as Property[]) ?? [])
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, cityFilter, bedsFilter, bathsFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProjects()
    }, 350)
    return () => clearTimeout(timer)
  }, [searchProjects])

  const clearFilters = () => {
    setSearchQuery('')
    setCityFilter('')
    setBedsFilter('')
    setBathsFilter('')
    setResults([])
    setHasSearched(false)
  }

  const hasActiveFilters = searchQuery || cityFilter || bedsFilter || bathsFilter

  function firstImageUrl(pictures: string | undefined): string | null {
    if (!pictures?.trim()) return null
    const first = pictures.split(',')[0]?.trim()
    return first && /^https?:\/\//i.test(first) ? first : null
  }

  /* ─── Presentation View ─── */

  if (selectedProject) {
    return (
      <div className="flex flex-col h-full">
        {/* Presentation Header */}
        <div className="shrink-0 flex items-center gap-4 px-4 md:px-6 py-3 bg-white border-b border-gray-200 shadow-sm">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white flex-shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate text-base md:text-lg">
                {selectedProject.project_name}
              </h1>
              <p className="text-xs text-gray-500 truncate">
                {selectedProject.builder}
                {selectedProject.city ? ` · ${selectedProject.city}` : ''}
                {selectedProject.price && selectedProject.price !== 'N/A'
                  ? ` · ${selectedProject.price}`
                  : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Map + Amenities */}
        <PresentationMapView
          property={selectedProject}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        />
      </div>
    )
  }

  /* ─── Search View ─── */

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 mt-12 lg:mt-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white">
            <Presentation className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Project Presentation</h1>
            <p className="text-gray-500 text-sm md:text-base">
              Search a project and present its amenities map to clients
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project name, builder, project ID, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[140px]"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={bedsFilter}
          onChange={(e) => setBedsFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any Beds</option>
          <option value="1">1 Bed</option>
          <option value="2">2 Beds</option>
          <option value="3">3 Beds</option>
          <option value="4">4+ Beds</option>
        </select>

        <select
          value={bathsFilter}
          onChange={(e) => setBathsFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any Baths</option>
          <option value="1">1 Bath</option>
          <option value="2">2 Baths</option>
          <option value="3">3+ Baths</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {results.length} project{results.length !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((project) => {
              const img = firstImageUrl(project.pictures)
              return (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={project.project_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate text-base">
                      {project.project_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{project.builder}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1.5 gap-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {project.address
                          ? `${project.address}, ${project.city}`
                          : project.city}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {project.bedrooms && project.bedrooms !== 'N/A' && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                          <BedDouble className="h-3.5 w-3.5" />
                          {project.bedrooms}
                        </span>
                      )}
                      {project.bathrooms && project.bathrooms !== 'N/A' && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                          <Bath className="h-3.5 w-3.5" />
                          {project.bathrooms}
                        </span>
                      )}
                      {project.price && project.price !== 'N/A' && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md font-medium">
                          <DollarSign className="h-3.5 w-3.5" />
                          {project.price}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedProject(project)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <MapPinned className="h-4 w-4" />
                      Present Amenities Map
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : hasSearched ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No projects found</p>
          <p className="text-gray-500 text-sm mt-1">Try a different search term or adjust filters</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-10 md:p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white mx-auto mb-6">
            <MapPinned className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Search for a Project</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Find a project by name, builder, or ID, then present a beautiful amenities map
            with nearby schools, stores, transit, parks, and more -- all with driving and walking distances.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['Schools', 'Grocery', 'Restaurants', 'Parks', 'Transit', 'Hospitals', 'Shopping'].map(
              (label) => (
                <span
                  key={label}
                  className="px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-blue-100 rounded-full text-xs font-medium text-blue-700"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
