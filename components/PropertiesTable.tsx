'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Download, Eye, ExternalLink } from 'lucide-react'
import ProjectDetailsModal from './ProjectDetailsModal'

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
  website_url: string
  created_at: string
  details: string
  features: string
  quick_facts: string
  pictures: string
  timestamp: string
  fj_landing_page: string
  precon_factory_landing_page: string
}

interface PropertiesTableProps {
  searchQuery?: string
  filters?: {
    city: string
    bedrooms: string
    bathrooms: string
  }
}

export default function PropertiesTable({ searchQuery = '', filters = { city: '', bedrooms: '', bathrooms: '' } }: PropertiesTableProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  
  const itemsPerPage = 20

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when search/filters change
  }, [searchQuery, filters])

  useEffect(() => {
    fetchProperties()
  }, [currentPage, searchQuery, filters])

  async function fetchProperties() {
    try {
      setLoading(true)
      
      let query = supabase
        .from('canada_properties')
        .select('*', { count: 'exact' })

      // Apply search query
      if (searchQuery && searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim()
        query = query.or(`project_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,builder.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,id.eq.${searchQuery}`)
      }

      // Apply city filter
      if (filters.city) {
        query = query.eq('city', filters.city)
      }

      // Apply bedrooms filter
      if (filters.bedrooms) {
        if (filters.bedrooms === '4') {
          // 4+ beds - need special handling
          query = query.or('bedrooms.ilike.%4%,bedrooms.ilike.%5%,bedrooms.ilike.%6%,bedrooms.ilike.%7%,bedrooms.ilike.%8%,bedrooms.ilike.%9%')
        } else {
          query = query.ilike('bedrooms', `%${filters.bedrooms}%`)
        }
      }

      // Apply bathrooms filter
      if (filters.bathrooms) {
        if (filters.bathrooms === '3') {
          // 3+ baths
          query = query.or('bathrooms.ilike.%3%,bathrooms.ilike.%4%,bathrooms.ilike.%5%')
        } else {
          query = query.ilike('bathrooms', `%${filters.bathrooms}%`)
        }
      }

      // Get total count with filters
      const countQuery = supabase
        .from('canada_properties')
        .select('*', { count: 'exact', head: true })

      // Apply same filters to count query
      if (searchQuery && searchQuery.trim()) {
        countQuery.or(`project_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,builder.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,id.eq.${searchQuery}`)
      }
      if (filters.city) {
        countQuery.eq('city', filters.city)
      }
      if (filters.bedrooms) {
        if (filters.bedrooms === '4') {
          countQuery.or('bedrooms.ilike.%4%,bedrooms.ilike.%5%,bedrooms.ilike.%6%,bedrooms.ilike.%7%,bedrooms.ilike.%8%,bedrooms.ilike.%9%')
        } else {
          countQuery.ilike('bedrooms', `%${filters.bedrooms}%`)
        }
      }
      if (filters.bathrooms) {
        if (filters.bathrooms === '3') {
          countQuery.or('bathrooms.ilike.%3%,bathrooms.ilike.%4%,bathrooms.ilike.%5%')
        } else {
          countQuery.ilike('bathrooms', `%${filters.bathrooms}%`)
        }
      }

      const { count } = await countQuery
      setTotalCount(count || 0)

      // Get paginated data with same filters
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const exportToCSV = () => {
    const headers = ['ID', 'Project Name', 'Builder', 'City', 'Price', 'Bedrooms', 'Bathrooms', 'Sqft']
    const csvData = properties.map(p => {
      // Debug: log any null values
      if (!p.id || !p.project_name || !p.builder || !p.city || !p.price) {
        console.log('CSV Export - Property with null fields:', {
          id: p.id,
          project_name: p.project_name,
          builder: p.builder,
          city: p.city,
          price: p.price
        })
      }
      return [
        p.id || '',
        p.project_name || '',
        p.builder || '',
        p.city || '',
        p.price || '',
        p.bedrooms || '',
        p.bathrooms || '',
        p.sqft || ''
      ]
    })

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `properties-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">All Properties</h3>
          <p className="text-xs md:text-sm text-gray-500 mt-1">{totalCount.toLocaleString()} total projects</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center px-3 md:px-4 py-2 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm touch-manipulation"
        >
          <Download className="h-4 w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden">
        <div className="divide-y divide-gray-200">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => setSelectedProperty(property)}
              className="p-4 hover:bg-blue-50 active:bg-blue-100 cursor-pointer touch-manipulation transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 text-base flex-1 pr-2">{property.project_name}</h4>
                <div className="flex items-center text-blue-600 text-sm font-medium whitespace-nowrap">
                  <Eye className="h-4 w-4 mr-1" />
                  <span>View →</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{property.builder}</p>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <span>{property.city}</span>
                <span className="mx-2">•</span>
                <span>{property.bedrooms}</span>
                <span className="mx-2">•</span>
                <span>{property.bathrooms}</span>
              </div>
              <p className="text-sm text-green-600 font-medium">{property.price && typeof property.price === 'string' ? property.price.substring(0, 40) : 'Contact for pricing'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Builder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                City
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Beds
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Baths
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {properties.map((property) => (
              <tr 
                key={property.id} 
                onClick={() => setSelectedProperty(property)}
                className="hover:bg-blue-50 active:bg-blue-100 cursor-pointer transition-colors touch-manipulation"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {property.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="font-medium">{property.project_name}</div>
                  <div className="text-gray-500 text-xs mt-1">{property.address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {property.builder}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {property.city}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {property.price && typeof property.price === 'string' ? property.price.substring(0, 30) : 'Contact'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {property.bedrooms}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {property.bathrooms}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-1 text-blue-600 font-medium pointer-events-none">
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* Pagination */}
      <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
        <div className="text-xs md:text-sm text-gray-500 text-center sm:text-left">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="px-3 md:px-4 py-1 text-xs md:text-sm text-gray-700 font-medium">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <ProjectDetailsModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  )
}

