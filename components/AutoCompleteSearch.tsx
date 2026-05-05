'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Suggestion {
  id: string
  project_name: string
  city: string
  builder: string
}

interface AutoCompleteSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function AutoCompleteSearch({ onSearch, placeholder = "Search projects, cities, builders..." }: AutoCompleteSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
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
      const searchLower = searchQuery.toLowerCase()

      // Search across multiple fields
      const { data, error } = await supabase
        .from('canada_properties')
        .select('id, project_name, city, builder')
        .or(`project_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,builder.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(8)

      if (error) throw error

      // Filter and sort suggestions
      const typedData = (data ?? []) as Suggestion[]

      const filtered = typedData.filter(item => {
        const nameMatch = item.project_name?.toLowerCase().includes(searchLower)
        const cityMatch = item.city?.toLowerCase().includes(searchLower)
        const builderMatch = item.builder?.toLowerCase().includes(searchLower)
        return nameMatch || cityMatch || builderMatch
      })

      // Remove duplicates and limit
      const unique = Array.from(
        new Map(filtered.map(item => [item.id, item])).values()
      ).slice(0, 8)

      setSuggestions(unique)
      setShowSuggestions(unique.length > 0)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.project_name)
    setShowSuggestions(false)
    onSearch(suggestion.project_name)
  }

  const handleSearch = () => {
    setShowSuggestions(false)
    onSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    onSearch('')
  }

  return (
    <div ref={searchRef} className="relative flex-1">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 md:py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-5 md:px-6 py-3 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium whitespace-nowrap shadow-md hover:shadow-lg touch-manipulation text-base md:text-sm"
        >
          Search
        </button>
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-pulse">Searching...</div>
            </div>
          )}
          {!isLoading && suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-4 md:px-4 py-4 md:py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-gray-100 last:border-b-0 transition-colors touch-manipulation"
            >
              <div className="font-medium text-base md:text-sm text-gray-900">{suggestion.project_name}</div>
              <div className="text-sm md:text-xs text-gray-500 mt-1">
                {suggestion.city} • {suggestion.builder}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

