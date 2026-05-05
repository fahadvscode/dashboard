'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Property {
  id: string
  project_name: string
  city: string
  builder: string
}

interface ProjectSearchSelectProps {
  onSelect: (property: Property) => void
  excludeIds?: string[]
  placeholder?: string
}

export default function ProjectSearchSelect({ onSelect, excludeIds = [], placeholder = 'Search projects to add...' }: ProjectSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Property[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions(query)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [query])

  async function fetchSuggestions(searchQuery: string) {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('canada_properties')
        .select('id, project_name, city, builder')
        .or(`project_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,builder.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(12)

      if (error) throw error

      const filtered = (data ?? []).filter((p: Property) => !excludeIds.includes(p.id)).slice(0, 10)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (suggestion: Property) => {
    onSelect(suggestion)
    setQuery('')
    setShowSuggestions(false)
  }

  return (
    <div ref={searchRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
          )}
          {!isLoading && suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0 flex items-center gap-3 transition-colors"
            >
              <Plus className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 truncate">{suggestion.project_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{suggestion.id}</span>
                  {' • '}{suggestion.city} • {suggestion.builder}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
