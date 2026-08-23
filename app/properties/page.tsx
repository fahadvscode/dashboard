'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, UploadCloud } from 'lucide-react'
import PropertiesTable from '@/components/PropertiesTable'
import ProjectUploadForm from '@/components/ProjectUploadForm'
import SearchFilters from '@/components/SearchFilters'

export default function CanadaProperties() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    city: '',
    bedrooms: '',
    bathrooms: '',
  })
  const [showUpload, setShowUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="mb-6 mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Canada Properties</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Browse all preconstruction projects, or upload one if it is missing
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload((open) => !open)}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <UploadCloud className="h-4 w-4" />
          Upload project
          {showUpload ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {showUpload && (
        <div className="mb-8">
          <ProjectUploadForm
            onSuccess={() => {
              setRefreshKey((key) => key + 1)
            }}
          />
        </div>
      )}

      <SearchFilters
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
      />

      <PropertiesTable
        searchQuery={searchQuery}
        filters={filters}
        refreshKey={refreshKey}
      />
    </div>
  )
}
