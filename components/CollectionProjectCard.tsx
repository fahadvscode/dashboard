'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, MapPin, DollarSign, BedDouble, Bath, Ruler, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { loadGoogleMapsScript } from '@/lib/loadGoogleMapsScript'

type Company = 'fj' | 'precon_factory'

interface Property {
  id: string
  project_name: string
  builder: string
  address: string
  city: string
  price: string
  bedrooms: string
  bathrooms: string
  sqft: string
  details: string
  features: string
  quick_facts: string
  pictures: string
  website_url: string
  fj_landing_page: string
  precon_factory_landing_page: string
  map_address?: string | null
  map_lat?: number | null
  map_lng?: number | null
}

interface Props {
  property: Property
  company: Company
  onRemove?: () => void
  showRemove?: boolean
  showMapAddressEdit?: boolean
  onMapLocationSaved?: () => void
}

export default function CollectionProjectCard({
  property,
  company,
  onRemove,
  showRemove = false,
  showMapAddressEdit = false,
  onMapLocationSaved,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [mapAddrInput, setMapAddrInput] = useState(property.map_address ?? '')
  const [mapSaving, setMapSaving] = useState(false)

  useEffect(() => {
    setMapAddrInput(property.map_address ?? '')
  }, [property.id, property.map_address])

  const getImages = () => {
    if (!property.pictures) return []
    return property.pictures.split(',').map(url => url.trim()).filter(url => url)
  }
  const images = getImages()
  const firstImage = images[0] || 'https://via.placeholder.com/400x200?text=Property+Image'

  async function saveMapLocation() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      alert('Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local')
      return
    }
    setMapSaving(true)
    try {
      await loadGoogleMapsScript(apiKey)
      const geocoder = new google.maps.Geocoder()
      const line = mapAddrInput.trim() || (property.address || '').trim()
      const q = [line, (property.city || '').trim(), 'Canada'].filter(Boolean).join(', ')

      let lat: number | null = null
      let lng: number | null = null

      if (q.length > 3) {
        const loc = await new Promise<google.maps.LatLngLiteral | null>((resolve) => {
          geocoder.geocode({ address: q }, (results, status) => {
            if (status === 'OK' && results?.[0]?.geometry?.location) {
              const l = results[0].geometry.location
              resolve({ lat: l.lat(), lng: l.lng() })
            } else resolve(null)
          })
        })
        if (loc) {
          lat = loc.lat
          lng = loc.lng
        }
      }

      const payload = {
        map_address: mapAddrInput.trim() || null,
        map_lat: lat,
        map_lng: lng,
      }

      const { error } = await (supabase as any)
        .from('canada_properties')
        .update(payload)
        .eq('id', property.id)
      if (error) {
        console.error(error)
        alert(
          error.message?.includes('column') && error.message?.includes('map_')
            ? 'Run the SQL migration database/add_canada_properties_map_columns.sql in Supabase, then try again.'
            : 'Could not save map address.'
        )
        return
      }
      onMapLocationSaved?.()
    } finally {
      setMapSaving(false)
    }
  }

  const landingPage = company === 'fj' ? property.fj_landing_page : property.precon_factory_landing_page
  const companyLabel = company === 'fj' ? 'FJ' : 'Precon Factory'
  const companyColors = company === 'fj'
    ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    : 'from-purple-600 via-purple-700 to-pink-600 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Image */}
        <div className="w-40 md:w-48 flex-shrink-0 relative">
          <img
            src={firstImage}
            alt={property.project_name}
            className="w-full h-full min-h-[140px] object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Property+Image'
            }}
          />
          {showRemove && onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Remove from collection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate" title={property.project_name}>
            {property.project_name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{property.builder}</p>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            <span className="truncate" title={property.address || property.city}>
              {(property.address || '').trim() ? `${property.address} · ${property.city}` : property.city}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            <div className="flex items-center text-gray-700">
              <BedDouble className="h-4 w-4 mr-1" />
              {property.bedrooms || 'TBD'}
            </div>
            <div className="flex items-center text-gray-700">
              <Bath className="h-4 w-4 mr-1" />
              {property.bathrooms || 'TBD'}
            </div>
            <div className="flex items-center text-gray-700">
              <Ruler className="h-4 w-4 mr-1" />
              {property.sqft || 'TBD'}
            </div>
            <div className="flex items-center text-green-600 font-medium">
              <DollarSign className="h-4 w-4" />
              {property.price && property.price !== 'N/A' ? property.price : 'Contact'}
            </div>
          </div>

          {/* Landing Page - Only show the relevant company link */}
          {landingPage && (
            <a
              href={landingPage}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${companyColors} text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all`}
            >
              <ExternalLink className="h-4 w-4" />
              Open {companyLabel} Landing Page
            </a>
          )}
          {!landingPage && (
            <p className="mt-3 text-xs text-amber-600">No {companyLabel} landing page</p>
          )}
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 text-sm space-y-2">
          {showMapAddressEdit && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-3 space-y-2">
              <p className="font-medium text-gray-800 text-xs uppercase tracking-wide">Map pin</p>
              <p className="text-xs text-gray-600">
                We geocode the main address when possible. If a project has no address or the pin is wrong, enter a full street address for the map.
              </p>
              <input
                type="text"
                value={mapAddrInput}
                onChange={(e) => setMapAddrInput(e.target.value)}
                placeholder={
                  (property.address || '').trim()
                    ? `Override (default: ${
                        property.address.length > 48
                          ? `${property.address.slice(0, 48)}…`
                          : property.address
                      })`
                    : 'e.g. 123 Main St, Mississauga ON'
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void saveMapLocation()}
                  disabled={mapSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {mapSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save map location
                </button>
                {property.map_lat != null && property.map_lng != null && (
                  <span className="text-xs text-green-700">Saved pin on map</span>
                )}
              </div>
            </div>
          )}
          {property.details && property.details !== 'N/A' && (
            <div>
              <p className="font-medium text-gray-700">Details</p>
              <p className="text-gray-600 whitespace-pre-line line-clamp-4">{property.details}</p>
            </div>
          )}
          {property.features && property.features !== 'N/A' && (
            <div>
              <p className="font-medium text-gray-700">Features</p>
              <p className="text-gray-600 whitespace-pre-line line-clamp-3">{property.features}</p>
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 font-medium transition-colors"
      >
        {expanded ? 'Show less' : 'Show more details'}
      </button>
    </div>
  )
}
