'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Smartphone, Copy, CheckCircle, Loader2, Sparkles } from 'lucide-react'

interface Project {
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
  fj_landing_page: string
  precon_factory_landing_page: string
}

interface Suggestion {
  id: string
  project_name: string
  city: string
  builder: string
}

interface GeneratedSMS {
  fj: string
  precon: string
}

export default function SMSCreator() {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedSMS, setGeneratedSMS] = useState<GeneratedSMS | null>(null)
  const [copiedFJ, setCopiedFJ] = useState(false)
  const [copiedPrecon, setCopiedPrecon] = useState(false)

  // Search for projects
  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('id, project_name, city, builder')
        .or(`project_name.ilike.%${query}%,city.ilike.%${query}%,builder.ilike.%${query}%,id.eq.${query}`)
        .limit(8)

      if (error) throw error

      setSuggestions(data || [])
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error searching projects:', error)
    }
  }

  // Select a project
  const handleSelectProject = async (suggestion: Suggestion) => {
    setLoading(true)
    setShowSuggestions(false)
    setSearchQuery(suggestion.project_name)
    setGeneratedSMS(null)

    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('*')
        .eq('id', suggestion.id)
        .single()

      if (error) throw error
      setSelectedProject(data)
    } catch (error) {
      console.error('Error fetching project:', error)
      alert('Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  // Generate SMS messages
  const handleGenerateSMS = async () => {
    if (!selectedProject) return

    setGenerating(true)
    try {
      const response = await fetch('/api/sms/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: selectedProject.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate SMS')
      }

      const data = await response.json()
      setGeneratedSMS(data)
    } catch (error) {
      console.error('Error generating SMS:', error)
      alert('Failed to generate SMS messages. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'fj' | 'precon') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'fj') {
        setCopiedFJ(true)
        setTimeout(() => setCopiedFJ(false), 2000)
      } else {
        setCopiedPrecon(true)
        setTimeout(() => setCopiedPrecon(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-6 mt-12 lg:mt-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">SMS Creator</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Generate professional SMS marketing messages using AI</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Project</h2>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by project name, city, builder, or ID..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                handleSearch(e.target.value)
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectProject(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{suggestion.project_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {suggestion.id} • {suggestion.city} • {suggestion.builder}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Project Info */}
      {selectedProject && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Selected Project</h2>
            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">ID: {selectedProject.id}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Project Name</p>
              <p className="font-medium text-gray-900">{selectedProject.project_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Builder</p>
              <p className="font-medium text-gray-900">{selectedProject.builder}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium text-gray-900">{selectedProject.city}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="font-medium text-gray-900">{selectedProject.price && typeof selectedProject.price === 'string' ? selectedProject.price.substring(0, 50) : 'Contact for pricing'}</p>
            </div>
          </div>

          <button
            onClick={handleGenerateSMS}
            disabled={generating}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating SMS Messages...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate SMS Messages
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated SMS Messages */}
      {generatedSMS && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FJ SMS */}
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                FJ Branded SMS
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {generatedSMS.fj}
                </p>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500">
                  {generatedSMS.fj.length} characters
                </span>
                <span className={`text-xs font-semibold ${generatedSMS.fj.length <= 160 ? 'text-green-600' : 'text-orange-600'}`}>
                  {generatedSMS.fj.length <= 160 ? '1 SMS' : `${Math.ceil(generatedSMS.fj.length / 160)} SMS`}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(generatedSMS.fj, 'fj')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copiedFJ ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Precon Factory SMS */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Precon Factory SMS
              </h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {generatedSMS.precon}
                </p>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-500">
                  {generatedSMS.precon.length} characters
                </span>
                <span className={`text-xs font-semibold ${generatedSMS.precon.length <= 160 ? 'text-green-600' : 'text-orange-600'}`}>
                  {generatedSMS.precon.length <= 160 ? '1 SMS' : `${Math.ceil(generatedSMS.precon.length / 160)} SMS`}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(generatedSMS.precon, 'precon')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {copiedPrecon ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedProject && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-500 text-sm">Search for a project above to get started with SMS generation</p>
        </div>
      )}
    </div>
  )
}

