'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getFirstPropertyImage } from '@/lib/propertyImages'
import { Building2, Loader2, MapPin, BedDouble, Bath, Ruler, DollarSign, Printer, ExternalLink } from 'lucide-react'
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

const BRAND = {
  fj: {
    label: 'Fahad Javed Real Estate',
    primary: '#1a3c34',
    secondary: '#c5a55a',
    gradient: 'from-[#1a3c34] to-[#0f2b24]',
    logo: 'https://cfzuypbljirmibmxpabi.supabase.co/storage/v1/object/public/email-images/fj%20logo.png',
  },
  precon_factory: {
    label: 'Precon Factory',
    primary: '#e52d27',
    secondary: '#ffffff',
    gradient: 'from-[#e52d27] to-[#b31217]',
    logo: 'https://cfzuypbljirmibmxpabi.supabase.co/storage/v1/object/public/email-images/preconfactorylogo.webp',
  },
} as const

export default function PublicPresentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const amenitiesDataRef = useRef<Record<string, Array<{ name: string; address: string; driveTime?: string; driveDist?: string; walkTime?: string; walkDist?: string; category: string }>>>({})

  const brandKey = (searchParams.get('brand') as Company) || 'precon_factory'
  const brand = BRAND[brandKey] || BRAND.precon_factory

  useEffect(() => {
    async function load() {
      const id = params.id as string
      if (!id) { setError('No project ID'); setLoading(false); return }
      try {
        const { data, error: err } = await supabase
          .from('canada_properties')
          .select('*')
          .eq('id', id)
          .single()
        if (err) throw err
        setProperty(data as Property)
      } catch {
        setError('Project not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md text-center">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-500 text-sm">{error || 'This presentation link may have expired or the project was removed.'}</p>
        </div>
      </div>
    )
  }

  const landingPage = brandKey === 'fj' ? property.fj_landing_page : property.precon_factory_landing_page

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Branded Header */}
      <div className={`shrink-0 bg-gradient-to-r ${brand.gradient} px-4 md:px-6 py-3 print-hide`}>
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <img src={brand.logo} alt={brand.label} className="h-8 md:h-10 object-contain rounded" />
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm md:text-lg truncate" style={{ color: brand.secondary }}>
              {property.project_name}
            </h1>
            <p className="text-xs truncate" style={{ color: `${brand.secondary}99` }}>
              {property.builder}
              {property.city ? ` \u00B7 ${property.city}` : ''}
              {property.price && property.price !== 'N/A' ? ` \u00B7 ${property.price}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-3 mr-3">
              {property.bedrooms && property.bedrooms !== 'N/A' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${brand.secondary}20`, color: brand.secondary }}>
                  <BedDouble className="h-3.5 w-3.5" /> {property.bedrooms}
                </span>
              )}
              {property.bathrooms && property.bathrooms !== 'N/A' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${brand.secondary}20`, color: brand.secondary }}>
                  <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
                </span>
              )}
              {property.price && property.price !== 'N/A' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${brand.secondary}20`, color: brand.secondary }}>
                  <DollarSign className="h-3.5 w-3.5" /> {property.price}
                </span>
              )}
            </div>
            {landingPage && (
              <a
                href={landingPage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: brand.secondary, color: brand.primary }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Details</span>
              </a>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-80"
              style={{ borderColor: `${brand.secondary}40`, color: brand.secondary }}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map + Amenities */}
      <div className="flex-1 min-h-0">
        <PresentationMapView
          property={property}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
          onAmenitiesLoaded={(data) => { amenitiesDataRef.current = data }}
        />
      </div>

      {/* Branded Footer */}
      <div className="shrink-0 px-4 py-2 border-t border-gray-200 bg-white flex items-center justify-between print-hide">
        <div className="flex items-center gap-2">
          <img src={brand.logo} alt={brand.label} className="h-5 object-contain rounded" />
          <span className="text-xs text-gray-400">{brand.label}</span>
        </div>
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>

      {/* Print-only layout */}
      <div className="print-only" ref={printRef}>
        <PublicPrintView property={property} brandKey={brandKey} amenitiesData={amenitiesDataRef.current} />
      </div>
    </div>
  )
}

const AMENITY_CATEGORIES: Record<string, { label: string; color: string }> = {
  school: { label: 'Schools', color: '#3b82f6' },
  supermarket: { label: 'Grocery & Supermarkets', color: '#22c55e' },
  restaurant: { label: 'Restaurants & Cafes', color: '#f97316' },
  shopping_mall: { label: 'Shopping & Malls', color: '#a855f7' },
  park: { label: 'Parks & Recreation', color: '#16a34a' },
  hospital: { label: 'Hospitals & Clinics', color: '#ef4444' },
  pharmacy: { label: 'Pharmacies', color: '#06b6d4' },
  transit_station: { label: 'Transit Stations', color: '#6366f1' },
  gas_station: { label: 'Gas Stations', color: '#eab308' },
  bank: { label: 'Banks', color: '#14b8a6' },
  gym: { label: 'Fitness & Gyms', color: '#f43f5e' },
  highway: { label: 'Highways & On-Ramps', color: '#78716c' },
}

function PublicPrintView({
  property,
  brandKey,
  amenitiesData,
}: {
  property: Property
  brandKey: Company
  amenitiesData: Record<string, Array<{ name: string; address: string; driveTime?: string; driveDist?: string; walkTime?: string; walkDist?: string; category: string }>>
}) {
  const brand = BRAND[brandKey]
  const landingPage = brandKey === 'fj' ? property.fj_landing_page : property.precon_factory_landing_page
  const firstImage = getFirstPropertyImage(property.pictures)
  const hasImage = !firstImage.includes('data:image/svg')

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '850px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: `3px solid ${brand.primary}` }}>
        <img src={brand.logo} alt={brand.label} style={{ height: '40px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: brand.primary }}>{property.project_name}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {property.builder} &middot; {property.city}
            {property.price && property.price !== 'N/A' ? ` \u00B7 ${property.price}` : ''}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {property.bedrooms && property.bedrooms !== 'N/A' && (
          <div style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
            {property.bedrooms} Bedrooms
          </div>
        )}
        {property.bathrooms && property.bathrooms !== 'N/A' && (
          <div style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
            {property.bathrooms} Bathrooms
          </div>
        )}
        {property.sqft && property.sqft !== 'N/A' && (
          <div style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
            {property.sqft}
          </div>
        )}
        {property.price && property.price !== 'N/A' && (
          <div style={{ padding: '8px 14px', border: `1px solid ${brand.primary}30`, borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: brand.primary }}>
            {property.price}
          </div>
        )}
      </div>

      {/* Amenities */}
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Nearby Amenities</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {Object.entries(amenitiesData).map(([catKey, items]) => {
          if (!items?.length) return null
          const cat = AMENITY_CATEGORIES[catKey]
          if (!cat) return null
          return (
            <div key={catKey} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>{cat.label}</span>
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: '10px', color: '#334155', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize: '9px', color: '#64748b' }}>
                    {item.driveTime ? `\uD83D\uDE97 ${item.driveTime}` : ''}
                    {item.walkTime ? ` \u00B7 \uD83D\uDEB6 ${item.walkTime}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: `2px solid ${brand.primary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={brand.logo} alt="" style={{ height: '16px', objectFit: 'contain' }} />
          <span>{brand.label}</span>
        </div>
        {landingPage && <span>{landingPage}</span>}
        <span>{new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}
