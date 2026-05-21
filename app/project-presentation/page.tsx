'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Printer,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Ruler,
  Info,
  Route,
  Building,
} from 'lucide-react'
import PresentationMapView, { type PresentationProperty } from '@/components/PresentationMapView'

type Company = 'fj' | 'precon_factory'

interface Property extends PresentationProperty {
  details: string
  features: string
  quick_facts: string
  website_url: string
  fj_landing_page: string
  precon_factory_landing_page: string
}

const BRAND_CONFIG: Record<Company, { label: string; gradient: string; primary: string; secondary: string }> = {
  fj: {
    label: 'FJ',
    gradient: 'from-blue-600 to-blue-700',
    primary: '#2563eb',
    secondary: '#1d4ed8',
  },
  precon_factory: {
    label: 'Precon Factory',
    gradient: 'from-purple-600 via-purple-700 to-pink-600',
    primary: '#9333ea',
    secondary: '#db2777',
  },
}

export default function ProjectPresentationPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [bedsFilter, setBedsFilter] = useState('')
  const [bathsFilter, setBathsFilter] = useState('')
  const [results, setResults] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Property | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  // Presentation state
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const [printBrand, setPrintBrand] = useState<Company>('precon_factory')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [commuteAddress, setCommuteAddress] = useState('')
  const [showCommute, setShowCommute] = useState(false)
  const [nearbyProjects, setNearbyProjects] = useState<Property[]>([])
  const [showNearby, setShowNearby] = useState(false)
  const [loadingNearby, setLoadingNearby] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)
  const amenitiesDataRef = useRef<Record<string, Array<{ name: string; address: string; driveTime?: string; driveDist?: string; walkTime?: string; walkDist?: string; category: string }>>>({})

  useEffect(() => {
    fetchCities()
  }, [])

  // Load project from URL ?id=...
  useEffect(() => {
    const id = searchParams.get('id')
    if (id && !selectedProject) {
      loadProjectById(id)
    }
  }, [searchParams])

  async function loadProjectById(id: string) {
    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      if (data) setSelectedProject(data as Property)
    } catch (err) {
      console.error('Error loading project by ID:', err)
    }
  }

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

  function getImages(pictures: string | undefined): string[] {
    if (!pictures?.trim()) return []
    return pictures.split(',').map(u => u.trim()).filter(u => /^https?:\/\//i.test(u))
  }

  // Fetch nearby competing projects
  async function fetchNearbyProjects() {
    if (!selectedProject) return
    setLoadingNearby(true)
    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('*')
        .ilike('city', selectedProject.city)
        .neq('id', selectedProject.id)
        .limit(10)

      if (error) throw error
      setNearbyProjects((data as Property[]) ?? [])
    } catch (err) {
      console.error('Error fetching nearby projects:', err)
      setNearbyProjects([])
    } finally {
      setLoadingNearby(false)
    }
  }

  useEffect(() => {
    if (selectedProject && showNearby) {
      fetchNearbyProjects()
    }
  }, [selectedProject, showNearby])

  // Share link
  const shareUrl = selectedProject
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/project-presentation?id=${selectedProject.id}`
    : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Print handler
  const handlePrint = () => {
    setShowPrintModal(false)
    setTimeout(() => window.print(), 200)
  }

  const handleSelectProject = (project: Property) => {
    setSelectedProject(project)
    setShowNearby(false)
    setNearbyProjects([])
    setShowCommute(false)
    setCommuteAddress('')
    setShowProjectInfo(false)
    // Update URL without navigation
    window.history.replaceState(null, '', `/project-presentation?id=${project.id}`)
  }

  const handleBack = () => {
    setSelectedProject(null)
    setShowNearby(false)
    setNearbyProjects([])
    setShowCommute(false)
    setCommuteAddress('')
    setShowProjectInfo(false)
    window.history.replaceState(null, '', '/project-presentation')
  }

  /* ─── Presentation View ─── */

  if (selectedProject) {
    const brand = BRAND_CONFIG[printBrand]
    const landingPage = printBrand === 'fj'
      ? selectedProject.fj_landing_page
      : selectedProject.precon_factory_landing_page
    const images = getImages(selectedProject.pictures)

    return (
      <div className="flex flex-col h-full" id="presentation-container">
        {/* Presentation Header */}
        <div className="shrink-0 flex items-center gap-2 md:gap-4 px-3 md:px-6 py-2.5 bg-white border-b border-gray-200 shadow-sm print-hide">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br ${brand.gradient} flex items-center justify-center text-white flex-shrink-0`}>
              <Building2 className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate text-sm md:text-lg">
                {selectedProject.project_name}
              </h1>
              <p className="text-xs text-gray-500 truncate hidden sm:block">
                {selectedProject.builder}
                {selectedProject.city ? ` · ${selectedProject.city}` : ''}
                {selectedProject.price && selectedProject.price !== 'N/A' ? ` · ${selectedProject.price}` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowProjectInfo(!showProjectInfo)}
              className={`p-2 rounded-lg transition-colors ${showProjectInfo ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Project Info"
            >
              <Info className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setShowCommute(!showCommute); if (showNearby) setShowNearby(false) }}
              className={`p-2 rounded-lg transition-colors ${showCommute ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Commute Calculator"
            >
              <Route className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setShowNearby(!showNearby); if (showCommute) setShowCommute(false) }}
              className={`p-2 rounded-lg transition-colors ${showNearby ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Nearby Projects"
            >
              <Building className="h-4 w-4" />
            </button>
            <div className="h-5 w-px bg-gray-200 mx-0.5" />
            <button
              onClick={() => setShowShareModal(true)}
              className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg text-sm font-semibold hover:from-gray-900 hover:to-black transition-all"
              title="Print Presentation"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden md:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Project Info Panel (collapsible) */}
        {showProjectInfo && (
          <div className="shrink-0 bg-white border-b border-gray-200 print-hide overflow-hidden">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Images */}
                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto shrink-0 pb-2">
                    {images.slice(0, 4).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`${selectedProject.project_name} ${i + 1}`}
                        className="h-28 md:h-36 w-auto rounded-lg object-cover flex-shrink-0 border border-gray-200"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ))}
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {selectedProject.bedrooms && selectedProject.bedrooms !== 'N/A' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                        <BedDouble className="h-4 w-4" /> {selectedProject.bedrooms} Beds
                      </span>
                    )}
                    {selectedProject.bathrooms && selectedProject.bathrooms !== 'N/A' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                        <Bath className="h-4 w-4" /> {selectedProject.bathrooms} Baths
                      </span>
                    )}
                    {selectedProject.sqft && selectedProject.sqft !== 'N/A' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                        <Ruler className="h-4 w-4" /> {selectedProject.sqft}
                      </span>
                    )}
                    {selectedProject.price && selectedProject.price !== 'N/A' && (
                      <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg font-semibold">
                        <DollarSign className="h-4 w-4" /> {selectedProject.price}
                      </span>
                    )}
                  </div>

                  {selectedProject.details && selectedProject.details !== 'N/A' && (
                    <p className="text-sm text-gray-600 line-clamp-3">{selectedProject.details}</p>
                  )}

                  {selectedProject.features && selectedProject.features !== 'N/A' && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Features</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{selectedProject.features}</p>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedProject.fj_landing_page && (
                      <a
                        href={selectedProject.fj_landing_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> FJ Landing Page
                      </a>
                    )}
                    {selectedProject.precon_factory_landing_page && (
                      <a
                        href={selectedProject.precon_factory_landing_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Precon Factory Page
                      </a>
                    )}
                    {selectedProject.website_url && (
                      <a
                        href={selectedProject.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Builder Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commute Calculator Bar */}
        {showCommute && (
          <div className="shrink-0 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-blue-200 px-4 md:px-6 py-3 print-hide">
            <div className="flex items-center gap-3 max-w-2xl">
              <Route className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Enter client's work address or any destination..."
                  value={commuteAddress}
                  onChange={(e) => setCommuteAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>
            <p className="text-xs text-indigo-500 mt-1.5 ml-8">
              Enter an address and the map will show driving, walking, and transit routes from the project
            </p>
          </div>
        )}

        {/* Nearby Projects Bar */}
        {showNearby && (
          <div className="shrink-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 md:px-6 py-3 print-hide">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Nearby Competing Projects in {selectedProject.city}
                  </p>
                  <p className="text-xs text-amber-600">
                    {loadingNearby ? 'Loading...' : `${nearbyProjects.length} other projects found`}
                  </p>
                </div>
              </div>
            </div>
            {!loadingNearby && nearbyProjects.length > 0 && (
              <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1">
                {nearbyProjects.map((np) => (
                  <button
                    key={np.id}
                    onClick={() => handleSelectProject(np)}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:shadow-sm transition-all text-left max-w-[240px]"
                  >
                    <Building2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{np.project_name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{np.builder} · {np.price || 'N/A'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map + Amenities */}
        <PresentationMapView
          property={selectedProject}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
          commuteDestination={showCommute && commuteAddress.trim().length >= 5 ? commuteAddress.trim() : undefined}
          nearbyProjects={showNearby ? nearbyProjects : undefined}
          onSelectNearbyProject={handleSelectProject}
          onAmenitiesLoaded={(data) => { amenitiesDataRef.current = data }}
        />

        {/* Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print-hide">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Print Presentation</h3>
                <p className="text-sm text-gray-500 mt-0.5">Select branding for the printed version</p>
              </div>
              <div className="p-6 space-y-3">
                {(Object.entries(BRAND_CONFIG) as [Company, typeof BRAND_CONFIG[Company]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setPrintBrand(key)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      printBrand === key
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{cfg.label}</p>
                      <p className="text-xs text-gray-500">Use {cfg.label} colors and branding</p>
                    </div>
                    {printBrand === key && <Check className="h-5 w-5 text-blue-600 ml-auto" />}
                  </button>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print-hide">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Share with Client</h3>
                <p className="text-sm text-gray-500 mt-0.5">Send this presentation link to your client</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Presentation Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-700 truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shrink-0"
                    >
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Anyone with this link can view the amenities map for <strong>{selectedProject.project_name}</strong>.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button onClick={() => setShowShareModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Print-Only Layout ─── */}
        <div className="print-only" ref={printRef}>
          <PrintablePresentation
            property={selectedProject}
            brand={printBrand}
            amenitiesData={amenitiesDataRef.current}
          />
        </div>
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

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate text-base">
                      {project.project_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{project.builder}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1.5 gap-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {project.address ? `${project.address}, ${project.city}` : project.city}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {project.bedrooms && project.bedrooms !== 'N/A' && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                          <BedDouble className="h-3.5 w-3.5" /> {project.bedrooms}
                        </span>
                      )}
                      {project.bathrooms && project.bathrooms !== 'N/A' && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                          <Bath className="h-3.5 w-3.5" /> {project.bathrooms}
                        </span>
                      )}
                      {project.price && project.price !== 'N/A' && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md font-medium">
                          <DollarSign className="h-3.5 w-3.5" /> {project.price}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelectProject(project)}
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

/* ─── Printable Presentation Component ─── */

const AMENITY_CATEGORIES: Record<string, { label: string; color: string }> = {
  school: { label: 'Schools', color: '#3b82f6' },
  supermarket: { label: 'Grocery', color: '#22c55e' },
  restaurant: { label: 'Restaurants', color: '#f97316' },
  shopping_mall: { label: 'Shopping', color: '#a855f7' },
  park: { label: 'Parks', color: '#16a34a' },
  hospital: { label: 'Hospitals', color: '#ef4444' },
  pharmacy: { label: 'Pharmacies', color: '#06b6d4' },
  transit_station: { label: 'Transit', color: '#6366f1' },
  gas_station: { label: 'Gas Stations', color: '#eab308' },
  bank: { label: 'Banks', color: '#14b8a6' },
  gym: { label: 'Fitness', color: '#f43f5e' },
}

function PrintablePresentation({
  property,
  brand,
  amenitiesData,
}: {
  property: Property
  brand: Company
  amenitiesData: Record<string, Array<{ name: string; address: string; driveTime?: string; driveDist?: string; walkTime?: string; walkDist?: string; category: string }>>
}) {
  const cfg = BRAND_CONFIG[brand]
  const landingPage = brand === 'fj' ? property.fj_landing_page : property.precon_factory_landing_page

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '32px', maxWidth: '850px', margin: '0 auto' }}>
      {/* Branded Header */}
      <div style={{ background: `linear-gradient(135deg, ${cfg.primary}, ${cfg.secondary})`, borderRadius: '12px', padding: '24px 28px', marginBottom: '24px', color: 'white' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', opacity: 0.9, marginBottom: '8px' }}>
          {cfg.label} — Project Presentation
        </div>
        <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.2 }}>{property.project_name}</div>
        <div style={{ fontSize: '13px', marginTop: '6px', opacity: 0.9 }}>
          {property.builder} · {property.address || ''}{property.address ? ', ' : ''}{property.city}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', fontWeight: 600 }}>
          {property.bedrooms && property.bedrooms !== 'N/A' && <span>{property.bedrooms} Beds</span>}
          {property.bathrooms && property.bathrooms !== 'N/A' && <span>{property.bathrooms} Baths</span>}
          {property.sqft && property.sqft !== 'N/A' && <span>{property.sqft}</span>}
          {property.price && property.price !== 'N/A' && <span>{property.price}</span>}
        </div>
      </div>

      {/* Amenities Table */}
      {Object.entries(amenitiesData).map(([catKey, items]) => {
        if (!items || items.length === 0) return null
        const catCfg = AMENITY_CATEGORIES[catKey]
        if (!catCfg) return null

        return (
          <div key={catKey} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: catCfg.color }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{catCfg.label}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left' as const, padding: '4px 8px', color: '#64748b', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left' as const, padding: '4px 8px', color: '#64748b', fontWeight: 600 }}>Address</th>
                  <th style={{ textAlign: 'center' as const, padding: '4px 8px', color: '#64748b', fontWeight: 600 }}>Drive</th>
                  <th style={{ textAlign: 'center' as const, padding: '4px 8px', color: '#64748b', fontWeight: 600 }}>Walk</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 500, color: '#1e293b' }}>{item.name}</td>
                    <td style={{ padding: '4px 8px', color: '#64748b' }}>{item.address}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' as const, color: '#3b82f6' }}>{item.driveTime || '—'}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' as const, color: '#16a34a' }}>{item.walkTime || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `2px solid ${cfg.primary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8' }}>
        <span>{cfg.label} — Property Presentation</span>
        {landingPage && <span>{landingPage}</span>}
        <span>{new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}
