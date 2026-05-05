'use client'

import { X, ExternalLink, MapPin, DollarSign, Home, Ruler, Building2, Calendar } from 'lucide-react'
import { useState } from 'react'

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
  timestamp: string
  created_at: string
  fj_landing_page: string
  precon_factory_landing_page: string
}

interface Props {
  property: Property
  onClose: () => void
}

export default function ProjectDetailsModal({ property, onClose }: Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const getImages = () => {
    if (!property.pictures) return []
    return property.pictures.split(',').map(url => url.trim()).filter(url => url)
  }

  const images = getImages()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-0 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-none md:rounded-2xl max-w-5xl w-full h-full md:h-auto md:max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 md:py-4 flex items-center justify-between z-10">
          <div className="flex-1 pr-2">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 line-clamp-2">{property.project_name}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">{property.builder}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 md:ml-4 p-3 md:p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors touch-manipulation flex-shrink-0"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="relative">
            <img
              src={images[currentImageIndex]}
              alt={property.project_name}
              className="w-full h-64 md:h-96 object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/800x400?text=Property+Image'
              }}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length)}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white active:bg-white p-3 md:p-3 rounded-full shadow-lg touch-manipulation"
                >
                  <span className="text-xl md:text-base">←</span>
                </button>
                <button
                  onClick={() => setCurrentImageIndex((currentImageIndex + 1) % images.length)}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white active:bg-white p-3 md:p-3 rounded-full shadow-lg touch-manipulation"
                >
                  <span className="text-xl md:text-base">→</span>
                </button>
                <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center text-blue-700 mb-2">
                <DollarSign className="h-5 w-5 mr-2" />
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wide">Price</span>
              </div>
              <p className="text-sm md:text-base text-gray-900 font-bold line-clamp-2 leading-tight">
                {property.price && property.price !== 'N/A' ? property.price : 'Price on Request'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center text-green-700 mb-2">
                <Home className="h-5 w-5 mr-2" />
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wide">Bedrooms</span>
              </div>
              <p className="text-sm md:text-base text-gray-900 font-bold">
                {property.bedrooms && property.bedrooms !== 'N/A' ? property.bedrooms : 'TBD'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center text-purple-700 mb-2">
                <Building2 className="h-5 w-5 mr-2" />
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wide">Bathrooms</span>
              </div>
              <p className="text-sm md:text-base text-gray-900 font-bold">
                {property.bathrooms && property.bathrooms !== 'N/A' ? property.bathrooms : 'TBD'}
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center text-orange-700 mb-2">
                <Ruler className="h-5 w-5 mr-2" />
                <span className="text-xs md:text-sm font-semibold uppercase tracking-wide">Square Feet</span>
              </div>
              <p className="text-sm md:text-base text-gray-900 font-bold">
                {property.sqft && property.sqft !== 'N/A' ? property.sqft : 'TBD'}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4 md:p-5">
            <div className="flex items-center text-gray-800 mb-3">
              <div className="bg-blue-600 text-white rounded-lg p-2 mr-3">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base md:text-lg">Location</h3>
            </div>
            <div className="ml-12 space-y-1">
              <p className="text-gray-900 font-medium text-sm md:text-base">{property.address}</p>
              <p className="text-gray-600 text-sm md:text-base">{property.city}</p>
            </div>
          </div>

          {/* ID and Timestamp */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
              <div className="flex items-center text-gray-600">
                <span className="font-medium mr-2">Project ID:</span>
                <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded border border-gray-300">
                  {property.id && typeof property.id === 'string' ? property.id.substring(0, 8) : property.id}...
                </span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium mr-2">Last Updated:</span>
                <span className="text-gray-800">
                  {new Date(property.timestamp || property.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          {property.details && property.details !== 'N/A' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-1 h-6 bg-blue-600 rounded-full mr-3"></div>
                Project Details
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
                <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {property.details.trim()}
                </p>
              </div>
            </div>
          )}

          {/* Features */}
          {property.features && property.features !== 'N/A' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-1 h-6 bg-purple-600 rounded-full mr-3"></div>
                Features & Amenities
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 md:p-5">
                {property.features.includes('\n') || property.features.includes('•') || property.features.includes('-') ? (
                  <div className="text-sm md:text-base text-gray-700 leading-relaxed">
                    {property.features.split(/\n|•/).filter(line => line.trim()).map((line, idx) => (
                      <div key={idx} className="mb-2 flex items-start">
                        <span className="text-purple-600 mr-2 mt-1">▸</span>
                        <span>{line.trim().replace(/^- /, '')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {property.features.trim()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Facts */}
          {property.quick_facts && property.quick_facts !== 'N/A' && (
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-1 h-6 bg-green-600 rounded-full mr-3"></div>
                Quick Facts
              </h3>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 md:p-5">
                {property.quick_facts.includes('\n') ? (
                  <div className="space-y-2">
                    {property.quick_facts.split('\n').filter(line => line.trim() && !line.includes('Show more')).map((line, idx) => {
                      // Check if line contains key-value pairs (like "Neighborhood: Downtown")
                      if (line.includes(':')) {
                        const [key, ...valueParts] = line.split(':')
                        const value = valueParts.join(':').trim()
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-green-200 last:border-b-0">
                            <span className="font-semibold text-gray-900 text-sm md:text-base sm:w-32 flex-shrink-0">
                              {key.trim()}
                            </span>
                            <span className="text-gray-700 text-sm md:text-base mt-1 sm:mt-0">
                              {value || 'N/A'}
                            </span>
                          </div>
                        )
                      }
                      // Regular paragraph
                      return (
                        <p key={idx} className="text-sm md:text-base text-gray-700 leading-relaxed">
                          {line.trim()}
                        </p>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {property.quick_facts.trim()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Landing Pages - ACTION BUTTONS */}
          <div className="border-t-2 border-gray-300 pt-6 md:pt-8 mt-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-5 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full mr-3"></div>
              Visit Landing Pages
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {property.fj_landing_page && (
                <a
                  href={property.fj_landing_page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-6 py-4 md:py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-xl md:rounded-lg hover:bg-blue-50 active:bg-blue-100 active:scale-[0.98] transition-all shadow-sm hover:shadow-md text-base md:text-sm font-semibold touch-manipulation"
                >
                  <div className="flex items-center">
                    <div className="bg-blue-600 text-white rounded-lg p-2 mr-3">
                      <span className="text-xs font-bold">FJ</span>
                    </div>
                    <span>Open FJ Landing Page</span>
                  </div>
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                </a>
              )}
              {property.precon_factory_landing_page && (
                <a
                  href={property.precon_factory_landing_page}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-6 py-4 md:py-3 bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 text-white rounded-xl md:rounded-lg hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 active:scale-[0.98] transition-all shadow-lg hover:shadow-xl text-base md:text-sm font-semibold touch-manipulation"
                >
                  <div className="flex items-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 mr-3 border border-white/30">
                      <span className="text-xs font-bold">PF</span>
                    </div>
                    <span>Open Precon Factory Page</span>
                  </div>
                  <ExternalLink className="h-5 w-5 text-white" />
                </a>
              )}
              {property.website_url && (
                <a
                  href={property.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-6 py-4 md:py-3 bg-gray-100 text-gray-700 rounded-xl md:rounded-lg hover:bg-gray-200 active:bg-gray-300 active:scale-[0.98] transition-all shadow-sm hover:shadow-md text-base md:text-sm font-medium touch-manipulation border border-gray-300"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Official Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-6 py-4 md:py-3 bg-gray-800 text-white rounded-xl md:rounded-lg hover:bg-gray-900 active:bg-black transition-colors font-medium touch-manipulation text-base md:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

