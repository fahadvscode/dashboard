'use client'

import { Filter } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AutoCompleteSearch from './AutoCompleteSearch'

interface SearchFiltersProps {
  onSearch?: (query: string) => void
  onFilterChange?: (filters: { city: string; bedrooms: string; bathrooms: string }) => void
}

export default function SearchFilters({ onSearch, onFilterChange }: SearchFiltersProps) {
  const [cities, setCities] = useState<string[]>([])
  const [filters, setFilters] = useState({
    city: '',
    bedrooms: '',
    bathrooms: '',
  })

  useEffect(() => {
    fetchCities()
  }, [])

  async function fetchCities() {
    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('city')
        .not('city', 'is', null)

      if (error) throw error

      // Get unique cities
      const typedData = (data ?? []) as { city: string | null }[]
      const uniqueCities = [...new Set(typedData.map(item => item.city || ''))]
        .filter(Boolean)
        .sort() as string[]
      setCities(uniqueCities)
    } catch (error) {
      console.error('Error fetching cities:', error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    if (onFilterChange) {
      onFilterChange(newFilters)
    }
  }

  const handleSearch = (query: string) => {
    if (onSearch) {
      onSearch(query)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
      <div className="flex items-center mb-4">
        <Filter className="h-5 w-5 text-gray-600 mr-2" />
        <h3 className="text-base md:text-lg font-semibold text-gray-900">Search & Filters</h3>
      </div>

      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-4">
        {/* Search Box with Autocomplete */}
        <div className="md:col-span-2 xl:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Projects
          </label>
          <AutoCompleteSearch 
            onSearch={handleSearch}
            placeholder="Type project name, city..."
          />
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <select
            className="w-full px-4 py-3 md:py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Bedrooms Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bedrooms
          </label>
          <select
            className="w-full px-4 py-3 md:py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            value={filters.bedrooms}
            onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1 Bed</option>
            <option value="2">2 Beds</option>
            <option value="3">3 Beds</option>
            <option value="4">4+ Beds</option>
          </select>
        </div>

        {/* Bathrooms Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bathrooms
          </label>
          <select
            className="w-full px-4 py-3 md:py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            value={filters.bathrooms}
            onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1 Bath</option>
            <option value="2">2 Baths</option>
            <option value="3">3+ Baths</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end md:col-span-2 xl:col-span-1">
          <button
            onClick={() => {
              const resetFilters = {
                city: '',
                bedrooms: '',
                bathrooms: '',
              }
              setFilters(resetFilters)
              if (onFilterChange) onFilterChange(resetFilters)
              if (onSearch) onSearch('')
            }}
            className="w-full px-4 py-3 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors font-medium touch-manipulation"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

