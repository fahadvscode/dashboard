'use client'

import { useState } from 'react'
import HotLeadsSection from '@/components/HotLeadsSection'
import LatestProjects from '@/components/LatestProjects'
import PropertiesTable from '@/components/PropertiesTable'
import SearchFilters from '@/components/SearchFilters'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    city: '',
    bedrooms: '',
    bathrooms: '',
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-6 mt-12 lg:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Canada Properties</h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">Browse and manage all preconstruction projects</p>
      </div>

      <HotLeadsSection />

      {/* Latest Projects Section */}
      <LatestProjects />

      {/* Search & Filters */}
      <SearchFilters 
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
      />

      {/* Properties Table */}
      <PropertiesTable 
        searchQuery={searchQuery}
        filters={filters}
      />
    </div>
  )
}
