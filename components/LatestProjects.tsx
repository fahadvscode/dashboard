'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Clock, MapPin, DollarSign, BedDouble, Bath } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import ProjectDetailsModal from './ProjectDetailsModal'

interface Property {
  id: string
  project_name: string
  city: string
  price: string
  bedrooms: string
  bathrooms: string
  pictures: string
  timestamp: string
  builder: string
  address: string
  sqft: string
  details: string
  features: string
  quick_facts: string
  website_url: string
  created_at: string
  fj_landing_page: string
  precon_factory_landing_page: string
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 1).trimEnd() + '…'
}

export default function LatestProjects() {
  const [latestProperties, setLatestProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  useEffect(() => {
    fetchLatestProperties()
  }, [])

  async function fetchLatestProperties() {
    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setLatestProperties(data || [])
    } catch (error) {
      console.error('Error fetching latest properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFirstImage = (pictures: string) => {
    if (!pictures) return '/placeholder-property.jpg'
    const imageUrls = pictures.split(',')
    return imageUrls[0]?.trim() || '/placeholder-property.jpg'
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Latest Projects Updated</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">📈 Latest Updates</h2>
        <span className="text-xs md:text-sm text-gray-500">Last 7 days</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {latestProperties.map((property) => (
          <div
            key={property.id}
            onClick={() => setSelectedProperty(property)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 active:shadow-lg active:scale-[0.98] transition-all cursor-pointer overflow-hidden touch-manipulation"
          >
            {/* Image */}
            <div className="h-44 md:h-40 bg-gray-200 relative">
              <img
                src={getFirstImage(property.pictures)}
                alt={property.project_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Property+Image'
                }}
              />
              <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                New
              </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-4">
              <h3 className="font-semibold text-base md:text-base text-gray-900 mb-1 truncate" title={property.project_name}>
                {property.project_name}
              </h3>
              <p className="text-sm text-gray-600 mb-3 block overflow-hidden text-ellipsis whitespace-nowrap" title={property.builder}>
                {truncateText(property.builder, 60)}
              </p>

              <div className="flex items-center text-sm text-gray-500 mb-3">
                <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span className="truncate">{property.city}</span>
              </div>

              <div className="flex items-center justify-between text-sm mb-3">
                <div className="flex items-center text-gray-700">
                  <BedDouble className="h-4 w-4 mr-1" />
                  <span>{property.bedrooms}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Bath className="h-4 w-4 mr-1" />
                  <span>{property.bathrooms}</span>
                </div>
                <div className="flex items-center text-green-600 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">{property.price && typeof property.price === 'string' ? property.price.substring(0, 20) : 'Contact'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                  <Clock className="h-3 w-3 mr-1.5" />
                  <span>
                    {(() => {
                      const updateDate = property.timestamp ? new Date(property.timestamp) : new Date(property.created_at)
                      const daysDiff = differenceInDays(new Date(), updateDate)
                      if (daysDiff === 0) return 'Updated Today'
                      if (daysDiff === 1) return 'Updated 1 Day Ago'
                      return `Updated ${daysDiff} Days Ago`
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Details Modal */}
      {selectedProperty && (
        <ProjectDetailsModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  )
}

