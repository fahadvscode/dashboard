'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Mail, Phone, User, MapPin, Calendar, X, MessageSquare, Search, Sparkles, Loader2, Trash2, AlertCircle, Brain, TrendingUp, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import MobileLeadCard from '@/components/MobileLeadCard'
import LeadDateRangeFilter from '@/components/LeadDateRangeFilter'
import {
  type LeadDatePreset,
  getLeadCreatedAtInterval,
  leadCreatedAtMatchesRange
} from '@/lib/leadDateRange'

type CallHistoryEntry = {
  outcome: string
  note: string
  timestamp: string
}

interface Lead {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  subject: string
  message: string
  source: string
  project_name: string
  status: string
  priority: string
  isagent: boolean
  created_at: string
  call_count: number | null
  call_history: CallHistoryEntry[] | null
  last_note: string | null
  lead_temperature: string | null
  project_id: string | null
  redirect_link: string | null
}

const CALL_OUTCOMES = [
  'Called – Left Voicemail',
  'Called – No Answer',
  'Spoke – Interested',
  'Spoke – Follow Up Needed',
  'Spoke – Not Ready',
  'Other'
] as const

const LEAD_TEMPERATURES = {
  hot: { label: 'Hot Lead', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-500' },
  warm: { label: 'Warm Lead', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' },
  cold: { label: 'Cold Lead', color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500' }
} as const

const normalizeCallHistory = (value: unknown): CallHistoryEntry[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter(Boolean) as CallHistoryEntry[]
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) as CallHistoryEntry[] : []
    } catch {
      return []
    }
  }
  return []
}

const normalizeLeadRecord = (lead: Lead): Lead => ({
  ...lead,
  call_count: lead.call_count ?? 0,
  call_history: normalizeCallHistory(lead.call_history)
})

export default function PreconFactoryLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [datePreset, setDatePreset] = useState<LeadDatePreset>('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [logOutcome, setLogOutcome] = useState<string>(CALL_OUTCOMES[0])
  const [logNote, setLogNote] = useState('')
  const [logError, setLogError] = useState('')
  const [logging, setLogging] = useState(false)
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [smsSuccess, setSmsSuccess] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [projectSuggestions, setProjectSuggestions] = useState<any[]>([])
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false)
  const [generatingSms, setGeneratingSms] = useState(false)
  const [updatingTemperature, setUpdatingTemperature] = useState(false)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [duplicateHistory, setDuplicateHistory] = useState<any[]>([])
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])
  const [loadingAiInsights, setLoadingAiInsights] = useState(false)
  const [showAiInsights, setShowAiInsights] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  // Check for leadId in URL and auto-open modal
  useEffect(() => {
    if (initialLoadDone && leads.length > 0) {
      const urlParams = new URLSearchParams(window.location.search)
      const leadId = urlParams.get('leadId')
      
      if (leadId) {
        const lead = leads.find(l => l.id === leadId)
        if (lead) {
          setSelectedLead(lead)
          // Clean URL without reload
          window.history.replaceState({}, '', '/precon-leads')
        }
      }
    }
  }, [initialLoadDone, leads])

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from('precon_factory_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const normalized = (data || []).map((lead) => normalizeLeadRecord(lead as Lead))
      setLeads(normalized)
      setInitialLoadDone(true)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const dateInterval = useMemo(
    () => getLeadCreatedAtInterval(datePreset, customDateStart, customDateEnd),
    [datePreset, customDateStart, customDateEnd]
  )

  const filteredLeads = leads.filter(lead => {
    if (filter === 'all') return true
    if (filter === 'agent') return lead.isagent === true
    if (filter === 'buyer') return lead.isagent === false
    if (filter === 'new') return lead.status === 'new'
    if (filter === 'hot') return lead.lead_temperature === 'hot'
    if (filter === 'warm') return lead.lead_temperature === 'warm'
    if (filter === 'cold') return lead.lead_temperature === 'cold'
    return true
  })
    .filter(lead => leadCreatedAtMatchesRange(lead.created_at, dateInterval))
    .filter(lead => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true
    const project = lead.project_name || lead.source || ''
    return [
      lead.firstname,
      lead.lastname,
      lead.email,
      lead.phone,
      project
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(query))
  })

  const selectedHistory = useMemo(() => {
    if (!selectedLead) return []
    return normalizeCallHistory(selectedLead.call_history).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [selectedLead])

  useEffect(() => {
    if (selectedLead) {
      setLogOutcome(CALL_OUTCOMES[0])
      setLogNote('')
      setLogError('')
      setSmsMessage('')
      setSmsError('')
      setSmsSuccess('')
      setProjectSearch('')
      setProjectSuggestions([])
      setShowProjectSuggestions(false)
      
      // Clear previous AI data
      setAiAnalysis(null)
      setAiRecommendations([])
      setShowAiInsights(false)
      
      // Fetch duplicate history
      fetchDuplicateHistory()
      
      // Auto-run AI analysis
      fetchAiInsights()
    } else {
      setDuplicateHistory([])
      setAiAnalysis(null)
      setAiRecommendations([])
      setShowAiInsights(false)
    }
  }, [selectedLead])

  const fetchDuplicateHistory = async () => {
    if (!selectedLead || (!selectedLead.email && !selectedLead.phone)) return

    setLoadingDuplicates(true)
    try {
      const response = await fetch('/api/leads/duplicate-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: selectedLead.email,
          phone: selectedLead.phone,
          firstname: selectedLead.firstname,
          lastname: selectedLead.lastname,
          currentTable: 'precon_factory_leads',
          currentLeadId: selectedLead.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch duplicate history')
      }

      const data = await response.json()
      setDuplicateHistory(data.duplicates || [])
    } catch (error) {
      console.error('Error fetching duplicate history:', error)
      setDuplicateHistory([])
    } finally {
      setLoadingDuplicates(false)
    }
  }

  const fetchAiInsights = async () => {
    if (!selectedLead) return

    setLoadingAiInsights(true)
    setShowAiInsights(true)
    try {
      // Fetch AI analysis
      const analysisResponse = await fetch('/api/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead })
      })

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        setAiAnalysis(analysisData.analysis)
      }

      // Fetch project recommendations
      const recommendationsResponse = await fetch('/api/leads/recommend-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead })
      })

      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json()
        setAiRecommendations(recommendationsData.recommendations || [])
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error)
    } finally {
      setLoadingAiInsights(false)
    }
  }

  // Search for projects
  const handleProjectSearch = async (query: string) => {
    setProjectSearch(query)
    
    if (query.length < 2) {
      setProjectSuggestions([])
      setShowProjectSuggestions(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('canada_properties')
        .select('id, project_name, city, builder')
        .or(`project_name.ilike.%${query}%,city.ilike.%${query}%,builder.ilike.%${query}%,id.eq.${query}`)
        .limit(5)

      if (error) throw error
      setProjectSuggestions(data || [])
      setShowProjectSuggestions(true)
    } catch (error) {
      console.error('Error searching projects:', error)
    }
  }

  // Generate personalized SMS
  const handleGeneratePersonalizedSms = async (projectId: string) => {
    if (!selectedLead) return

    setGeneratingSms(true)
    setSmsError('')
    setShowProjectSuggestions(false)

    try {
      const response = await fetch('/api/sms/generate-personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: projectId,
          leadName: selectedLead.firstname || 'there',
          brand: 'precon'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate SMS')
      }

      const data = await response.json()
      setSmsMessage(data.message)
      setProjectSearch('')
      setSmsSuccess(`SMS generated for ${data.projectName}!`)
      setTimeout(() => setSmsSuccess(''), 3000)
    } catch (error) {
      console.error('Error generating SMS:', error)
      setSmsError('Failed to generate SMS. Please try again.')
    } finally {
      setGeneratingSms(false)
    }
  }

  // Update lead temperature
  const handleUpdateTemperature = async (leadId: string, temperature: string) => {
    setUpdatingTemperature(true)

    try {
      const response = await fetch('/api/leads/update-temperature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'precon_factory_leads',
          leadId: leadId,
          temperature: temperature
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update temperature')
      }

      const data = await response.json()
      
      // Update leads list
      setLeads(prev =>
        prev.map(lead => (lead.id === leadId ? { ...lead, lead_temperature: temperature } : lead))
      )

      // Update selected lead if it's the one being updated
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, lead_temperature: temperature } : null)
      }
    } catch (error) {
      console.error('Error updating temperature:', error)
      alert('Failed to update lead temperature')
    } finally {
      setUpdatingTemperature(false)
    }
  }

  const handleLogCall = async () => {
    if (!selectedLead) return

    setLogging(true)
    setLogError('')

    try {
      const response = await fetch('/api/leads/log-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'precon_factory_leads',
          leadId: selectedLead.id,
          outcome: logOutcome,
          note: logNote.trim()
        })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || 'Unable to log call right now. Please try again.')
      }

      const payload = await response.json()
      const updatedLead = normalizeLeadRecord(payload.lead as Lead)

      setLeads(prev =>
        prev.map(lead => (lead.id === updatedLead.id ? updatedLead : lead))
      )
      setSelectedLead(updatedLead)
      setLogNote('')
      setLogOutcome(CALL_OUTCOMES[0])
    } catch (error) {
      console.error('Error logging call:', error)
      setLogError(error instanceof Error ? error.message : 'Unable to log call right now. Please try again.')
    } finally {
      setLogging(false)
    }
  }

  const handleSendSms = async () => {
    if (!selectedLead || !smsMessage.trim()) return

    setSendingSms(true)
    setSmsError('')
    setSmsSuccess('')

    try {
      const response = await fetch('/api/leads/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: selectedLead.phone,
          message: smsMessage.trim(),
          leadName: `${selectedLead.firstname} ${selectedLead.lastname}`,
          leadId: selectedLead.id,
          leadTable: 'precon_factory_leads'
        })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || 'Unable to send SMS right now. Please try again.')
      }

      setSmsSuccess('SMS sent successfully!')
      setSmsMessage('')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSmsSuccess('')
      }, 3000)
    } catch (error) {
      console.error('Error sending SMS:', error)
      setSmsError(error instanceof Error ? error.message : 'Unable to send SMS right now. Please try again.')
    } finally {
      setSendingSms(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Project', 'Status', 'Type', 'Date']
    const csvData = filteredLeads.map(l => [
      `${l.firstname} ${l.lastname}`,
      l.email,
      l.phone,
      l.project_name || 'N/A',
      l.status,
      l.isagent ? 'Agent' : 'Buyer',
      l.created_at
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `precon-factory-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set())
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(lead => lead.id)))
    }
  }

  const handleToggleSelect = (leadId: string) => {
    const newSelected = new Set(selectedLeadIds)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeadIds(newSelected)
  }

  const handleDeleteLeads = async (leadIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${leadIds.length} lead(s)? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/leads/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'precon_factory_leads',
          leadIds: leadIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete leads')
      }

      // Remove deleted leads from state
      setLeads(prev => prev.filter(lead => !leadIds.includes(lead.id)))
      setSelectedLeadIds(new Set())
      
      // Close modal if selected lead was deleted
      if (selectedLead && leadIds.includes(selectedLead.id)) {
        setSelectedLead(null)
      }
    } catch (error) {
      console.error('Error deleting leads:', error)
      alert('Failed to delete leads. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    handleDeleteLeads([leadId])
  }

  if (loading) {
    return <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8"><div className="animate-pulse">Loading...</div></div>
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Precon Factory Leads</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">{filteredLeads.length} total leads</p>
        </div>
        <div className="flex gap-2">
          {selectedLeadIds.size > 0 && (
            <button
              onClick={() => handleDeleteLeads(Array.from(selectedLeadIds))}
              disabled={deleting}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedLeadIds.size})
            </button>
          )}
        <button
          onClick={exportToCSV}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              type="text"
              placeholder="Search by name, email, phone, or project"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>
        <LeadDateRangeFilter
          preset={datePreset}
          onPresetChange={setDatePreset}
          customStart={customDateStart}
          customEnd={customDateEnd}
          onCustomStartChange={setCustomDateStart}
          onCustomEndChange={setCustomDateEnd}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            All ({leads.length})
          </button>
          <button
            onClick={() => setFilter('agent')}
            className={`px-4 py-2 rounded-lg ${filter === 'agent' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Agents ({leads.filter(l => l.isagent).length})
          </button>
          <button
            onClick={() => setFilter('buyer')}
            className={`px-4 py-2 rounded-lg ${filter === 'buyer' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Buyers ({leads.filter(l => !l.isagent).length})
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-4 py-2 rounded-lg ${filter === 'new' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            New ({leads.filter(l => l.status === 'new').length})
          </button>
          <button
            onClick={() => setFilter('hot')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${filter === 'hot' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Hot ({leads.filter(l => l.lead_temperature === 'hot').length})
          </button>
          <button
            onClick={() => setFilter('warm')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${filter === 'warm' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Warm ({leads.filter(l => l.lead_temperature === 'warm').length})
          </button>
          <button
            onClick={() => setFilter('cold')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${filter === 'cold' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Cold ({leads.filter(l => l.lead_temperature === 'cold').length})
          </button>
        </div>
      </div>

      {/* Table View - All Devices */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase text-gray-500 tracking-wider">
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                    onChange={handleToggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3">First Name</th>
                <th className="px-6 py-3">Last Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Project Name</th>
                <th className="px-6 py-3">Project ID</th>
                <th className="px-6 py-3">Landing Page</th>
                <th className="px-6 py-3">Calls</th>
                <th className="px-6 py-3">Temperature</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Received</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredLeads.map((lead) => {
                const project = lead.project_name || lead.source || 'N/A'
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="cursor-pointer hover:bg-purple-50/60 transition-colors"
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => handleToggleSelect(lead.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{lead.firstname || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{lead.lastname || '—'}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 underline-offset-2 hover:underline">{lead.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{lead.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{project}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{lead.project_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {lead.redirect_link ? (
                        <a 
                          href={lead.redirect_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.redirect_link}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                        Calls: {lead.call_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.lead_temperature || 'warm'}
                        onChange={(e) => handleUpdateTemperature(lead.id, e.target.value)}
                        disabled={updatingTemperature}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${
                          LEAD_TEMPERATURES[lead.lead_temperature as keyof typeof LEAD_TEMPERATURES]?.color || LEAD_TEMPERATURES.warm.color
                        }`}
                      >
                        <option value="hot">🔴 Hot</option>
                        <option value="warm">🟢 Warm</option>
                        <option value="cold">🟠 Cold</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${lead.isagent ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {lead.isagent ? 'Agent' : 'Buyer'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {lead.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDeleteSingle(lead.id, e)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-50"
                        title="Delete lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-sm text-gray-500">
                    No leads match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-50 bg-white">
              <button
                onClick={() => setSelectedLead(null)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 hover:scale-110 border-2 border-white"
                aria-label="Close lead details"
              >
                <X className="h-5 w-5 stroke-[3]" />
              </button>
            </div>

            <div className="flex items-start justify-between border-b border-gray-100 px-6 pt-5 pb-4 pr-16">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedLead.firstname} {selectedLead.lastname}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedLead.isagent ? 'Agent Lead' : 'Buyer Lead'} · {formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-gray-700">
                  <User className="mr-3 h-4 w-4 text-gray-400" />
                  <span>{selectedLead.firstname} {selectedLead.lastname}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Mail className="mr-3 h-4 w-4 text-gray-400" />
                  <a href={`mailto:${selectedLead.email}`} className="text-blue-600 underline-offset-2 hover:underline">
                    {selectedLead.email}
                  </a>
                </div>
                <div className="flex items-center text-gray-700">
                  <Phone className="mr-3 h-4 w-4 text-gray-400" />
                  <a href={`tel:${selectedLead.phone}`} className="text-gray-700 hover:text-gray-900">
                    {selectedLead.phone || '—'}
                  </a>
                </div>
                {(selectedLead.project_name || selectedLead.source) && (
                  <div className="flex items-center text-gray-700">
                    <MapPin className="mr-3 h-4 w-4 text-gray-400" />
                    <span>{selectedLead.project_name || selectedLead.source}</span>
                  </div>
                )}
                {selectedLead.project_id && (
                  <div className="flex items-center text-gray-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Project ID:</span>
                    <span>{selectedLead.project_id}</span>
                  </div>
                )}
                {selectedLead.redirect_link && (
                  <div className="flex items-center text-gray-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Landing Page:</span>
                    <a 
                      href={selectedLead.redirect_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline truncate"
                    >
                      {selectedLead.redirect_link}
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Calls Logged</span>
                  <div className="mt-2 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                    {selectedLead.call_count || 0} Calls
                  </div>
                  {selectedLead.last_note && (
                    <p className="mt-2 text-xs text-gray-500">
                      Last note: {selectedLead.last_note}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Log Call</span>
                    <span className="text-xs text-gray-400">Total: {selectedLead.call_count || 0}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <select
                      value={logOutcome}
                      onChange={(event) => setLogOutcome(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    >
                      {CALL_OUTCOMES.map((outcome) => (
                        <option key={outcome} value={outcome}>{outcome}</option>
                      ))}
                    </select>
                    <textarea
                      value={logNote}
                      onChange={(event) => setLogNote(event.target.value)}
                      placeholder="Add quick note (optional)"
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    {logError && (
                      <p className="text-xs text-red-500">{logError}</p>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleLogCall()
                      }}
                      disabled={logging}
                      className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {logging ? 'Saving…' : 'Log Call'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">AI SMS Generator</span>
                    <Sparkles className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search project to generate SMS..."
                      value={projectSearch}
                      onChange={(e) => handleProjectSearch(e.target.value)}
                      onFocus={() => {
                        if (projectSuggestions.length > 0) {
                          setShowProjectSuggestions(true)
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-100"
                    />
                    {showProjectSuggestions && projectSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {projectSuggestions.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handleGeneratePersonalizedSms(project.id)}
                            disabled={generatingSms}
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition-colors disabled:opacity-50"
                          >
                            <div className="text-xs font-medium text-gray-900">{project.project_name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {project.city} • {project.builder} • ID: {project.id}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {generatingSms && (
                    <div className="flex items-center justify-center gap-2 text-xs text-purple-600 mb-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating personalized SMS...</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Send SMS</span>
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={smsMessage}
                      onChange={(event) => setSmsMessage(event.target.value)}
                      placeholder="Type your SMS message here or generate one above..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                    {smsError && (
                      <p className="text-xs text-red-500">{smsError}</p>
                    )}
                    {smsSuccess && (
                      <p className="text-xs text-green-600 font-semibold">{smsSuccess}</p>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleSendSms()
                      }}
                      disabled={sendingSms || !smsMessage.trim() || !selectedLead.phone}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {sendingSms ? 'Sending…' : 'Send SMS'}
                    </button>
                    {!selectedLead.phone && (
                      <p className="text-xs text-gray-500 text-center">No phone number available</p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lead Temperature</span>
                  <select
                    value={selectedLead.lead_temperature || 'warm'}
                    onChange={(e) => handleUpdateTemperature(selectedLead.id, e.target.value)}
                    disabled={updatingTemperature}
                    className={`mt-2 w-full text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer border border-gray-200 ${
                      LEAD_TEMPERATURES[selectedLead.lead_temperature as keyof typeof LEAD_TEMPERATURES]?.color || LEAD_TEMPERATURES.warm.color
                    }`}
                  >
                    <option value="hot">🔴 Hot Lead</option>
                    <option value="warm">🟢 Warm Lead</option>
                    <option value="cold">🟠 Cold Lead</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
                  <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${selectedLead.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedLead.status || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Priority</span>
                  <div className="mt-2 text-gray-700">{selectedLead.priority || '—'}</div>
                </div>
                {selectedLead.subject && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</span>
                    <div className="mt-2 text-gray-700">{selectedLead.subject}</div>
                  </div>
                )}
              </div>
            </div>

            {selectedLead.message && (
              <div className="border-t border-gray-100 px-6 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</span>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {selectedLead.message}
                </p>
              </div>
            )}

            {/* AI Lead Intelligence Section */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-bold text-purple-900">🤖 AI Lead Intelligence</span>
                </div>
                {loadingAiInsights && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">Analyzing...</span>
                  </div>
                )}
                {!loadingAiInsights && aiAnalysis && (
                  <button
                    onClick={() => fetchAiInsights()}
                    className="px-3 py-1.5 text-xs text-white bg-purple-600 hover:bg-purple-700 font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-analyze
                  </button>
                )}
              </div>

              {loadingAiInsights && (
                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <p className="text-sm text-gray-600">Analyzing lead with AI...</p>
                  <p className="text-xs text-gray-500">Scoring, extracting insights, finding matches</p>
                </div>
              )}

              {!loadingAiInsights && aiAnalysis && (
                <div className="mt-4 space-y-4">
                  {/* Lead Score */}
                  <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Lead Score</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${
                          aiAnalysis.score >= 80 ? 'text-red-600' :
                          aiAnalysis.score >= 50 ? 'text-green-600' :
                          'text-orange-600'
                        }`}>
                          {aiAnalysis.score}
                        </span>
                        <span className="text-lg text-gray-400">/100</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          aiAnalysis.score >= 80 ? 'bg-red-100 text-red-700' :
                          aiAnalysis.score >= 50 ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {aiAnalysis.score >= 80 ? '🔥 HOT' :
                           aiAnalysis.score >= 50 ? '⭐ WARM' :
                           '❄️ COLD'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{aiAnalysis.reasoning}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                        aiAnalysis.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        aiAnalysis.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {aiAnalysis.confidence}
                      </span>
                    </div>
                  </div>

                  {/* Key Insights */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Key Insights</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {aiAnalysis.insights.budget && aiAnalysis.insights.budget !== 'Not mentioned' && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-24">Budget:</span>
                          <span className="text-gray-700 flex-1">{aiAnalysis.insights.budget}</span>
                        </div>
                      )}
                      {aiAnalysis.insights.timeline && aiAnalysis.insights.timeline !== 'Not mentioned' && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-24">Timeline:</span>
                          <span className="text-gray-700 flex-1">{aiAnalysis.insights.timeline}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-500 w-24">Buyer Type:</span>
                        <span className="text-gray-700 flex-1">{aiAnalysis.insights.buyerType}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-gray-500 w-24">Urgency:</span>
                        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                          aiAnalysis.insights.urgency === 'high' ? 'bg-red-100 text-red-700' :
                          aiAnalysis.insights.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {aiAnalysis.insights.urgency}
                        </span>
                      </div>
                      {aiAnalysis.insights.priorities && aiAnalysis.insights.priorities.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-500 w-24">Priorities:</span>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {aiAnalysis.insights.priorities.map((priority: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                {priority}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {aiAnalysis.keyPoints && aiAnalysis.keyPoints.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <ul className="space-y-1">
                          {aiAnalysis.keyPoints.map((point: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Project Recommendations */}
                  {aiRecommendations.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Recommended Projects ({aiRecommendations.length})
                        </span>
                      </div>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {aiRecommendations.map((rec, idx) => (
                          <div key={rec.project.id} className="rounded-lg border border-green-200 bg-green-50/30 p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-gray-900">{rec.project.project_name}</span>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-semibold">
                                    {rec.matchScore}% Match
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>📍 {rec.project.city} • {rec.project.builder}</div>
                                  {rec.project.bedrooms && <div>🏠 {rec.project.bedrooms}</div>}
                                  {rec.project.price && typeof rec.project.price === 'string' && <div>💰 {rec.project.price.substring(0, 80)}</div>}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <p className="text-xs text-gray-700 mb-2">
                                <span className="font-semibold">Why this matches:</span> {rec.reasoning}
                              </p>
                              <p className="text-xs text-green-700 font-medium mb-2">
                                💡 Pitch: "{rec.pitch}"
                              </p>
                              {rec.keyDifferentiators && rec.keyDifferentiators.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {rec.keyDifferentiators.map((diff: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-white text-gray-700 text-xs rounded border border-gray-200">
                                      ✓ {diff}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Duplicate History Section */}
            {duplicateHistory.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Duplicate Lead Detected ({duplicateHistory.length} {duplicateHistory.length === 1 ? 'inquiry' : 'inquiries'})
                  </span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {duplicateHistory.map((duplicate, index) => (
                    <div key={duplicate.id || index} className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-orange-700">{duplicate.tableName}</span>
                          {duplicate.lead_temperature && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              LEAD_TEMPERATURES[duplicate.lead_temperature as keyof typeof LEAD_TEMPERATURES]?.color || LEAD_TEMPERATURES.warm.color
                            }`}>
                              {LEAD_TEMPERATURES[duplicate.lead_temperature as keyof typeof LEAD_TEMPERATURES]?.label || 'Warm'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(duplicate.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-700">
                        <div className="font-medium text-gray-900">
                          📍 Project: {duplicate.project_name || 'N/A'}
                        </div>
                        {duplicate.project_id && (
                          <div>Project ID: {duplicate.project_id}</div>
                        )}
                        <div>Status: <span className="font-medium">{duplicate.status || 'N/A'}</span></div>
                        <div>Type: <span className="font-medium">{duplicate.isagent ? 'Agent' : 'Buyer'}</span></div>
                        {duplicate.call_count > 0 && (
                          <div>📞 Calls Logged: <span className="font-medium">{duplicate.call_count}</span></div>
                        )}
                        {duplicate.last_note && (
                          <div className="mt-2 pt-2 border-t border-orange-200">
                            <span className="font-medium">Last Note:</span> {duplicate.last_note}
                          </div>
                        )}
                        {duplicate.subject && (
                          <div className="mt-2 pt-2 border-t border-orange-200">
                            <span className="font-medium">Subject:</span> {duplicate.subject}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Call History</span>
                <span className="text-xs text-gray-400">{selectedHistory.length} entries</span>
              </div>
              {selectedHistory.length === 0 ? (
                <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                  No calls logged yet. Use "Log Call" to start tracking touchpoints.
                </p>
              ) : (
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                  {selectedHistory.map((entry, index) => (
                    <div key={`${entry.timestamp}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{entry.outcome}</span>
                        <span className="text-gray-400">
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-2 text-sm text-gray-600">{entry.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

