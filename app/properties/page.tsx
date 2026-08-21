'use client'

import { useState } from 'react'
import HotLeadsSection from '@/components/HotLeadsSection'
import LatestProjects from '@/components/LatestProjects'
import PropertiesTable from '@/components/PropertiesTable'
import SearchFilters from '@/components/SearchFilters'

export default function CanadaProperties() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    city: '',
    bedrooms: '',
    bathrooms: '',
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="mb-6 mt-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Canada Properties</h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">Browse and manage all preconstruction projects</p>
      </div>

      <HotLeadsSection />

      <LatestProjects />

      <SearchFilters 
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
      />

      <PropertiesTable 
        searchQuery={searchQuery}
        filters={filters}
      />
    </div>
  )
}
