'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Mail, Phone, User, MapPin, Calendar, X, MessageSquare, Loader2, Trash2, Home, DollarSign, Users, CreditCard, AlertCircle, FileText, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

interface RentalLead {
  id: string
  full_name: string | null
  firstname: string | null
  lastname: string | null
  email: string
  phone: string
  neighbourhood: string
  property_type: string
  bedrooms: string
  budget: number
  move_in_date: string
  features: string[]
  credit_score: string
  occupants: string
  has_pets: boolean
  pet_details: string
  notes: string
  status: string
  priority: string
  source: string
  created_at: string
  updated_at: string
  call_count: number | null
  call_history: CallHistoryEntry[] | null
  last_note: string | null
  lead_temperature: string | null
  application_sent: boolean | null
  application_sent_at: string | null
  application_sent_count: number | null
  application_history: Array<{sent_at: string, sent_to: string, sent_by: string}> | null
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

const normalizeLeadRecord = (lead: RentalLead): RentalLead => ({
  ...lead,
  call_count: lead.call_count ?? 0,
  call_history: normalizeCallHistory(lead.call_history),
  features: Array.isArray(lead.features) ? lead.features : [],
  budget: lead.budget ?? 0
})

// Helper function to get display name
const getDisplayName = (lead: RentalLead): string => {
  if (lead.firstname || lead.lastname) {
    return [lead.firstname, lead.lastname].filter(Boolean).join(' ').trim()
  }
  return lead.full_name || '—'
}

export default function RentalLeads() {
  const [leads, setLeads] = useState<RentalLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [datePreset, setDatePreset] = useState<LeadDatePreset>('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [selectedLead, setSelectedLead] = useState<RentalLead | null>(null)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [logOutcome, setLogOutcome] = useState<string>(CALL_OUTCOMES[0])
  const [logNote, setLogNote] = useState('')
  const [logError, setLogError] = useState('')
  const [logging, setLogging] = useState(false)
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [smsSuccess, setSmsSuccess] = useState('')
  const [updatingTemperature, setUpdatingTemperature] = useState(false)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [duplicateHistory, setDuplicateHistory] = useState<any[]>([])
  const [sendingApplication, setSendingApplication] = useState(false)
  const [applicationSentLeads, setApplicationSentLeads] = useState<Set<string>>(new Set())
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  useEffect(() => {
    if (initialLoadDone && leads.length > 0) {
      const urlParams = new URLSearchParams(window.location.search)
      const leadId = urlParams.get('leadId')
      
      if (leadId) {
        const lead = leads.find(l => l.id === leadId)
        if (lead) {
          setSelectedLead(lead)
          window.history.replaceState({}, '', '/rental-leads')
        }
      }
    }
  }, [initialLoadDone, leads])

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from('rental_leads')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      const normalized = (data || []).map((lead) => normalizeLeadRecord(lead as RentalLead))
      
      // Update application sent leads from database
      if (data) {
        const sentLeadIds = new Set(
          normalized.filter(lead => lead.application_sent).map(lead => lead.id)
        )
        setApplicationSentLeads(sentLeadIds)
      }
      setLeads(normalized)
      setInitialLoadDone(true)
    } catch (error) {
      console.error('Error fetching rental leads:', error)
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
    if (filter === 'new') return lead.status === 'new'
    if (filter === 'hot') return lead.lead_temperature === 'hot'
    if (filter === 'warm') return lead.lead_temperature === 'warm'
    if (filter === 'cold') return lead.lead_temperature === 'cold'
    if (filter === 'has_pets') return lead.has_pets === true
    return true
  })
    .filter(lead => leadCreatedAtMatchesRange(lead.created_at, dateInterval))
    .filter(lead => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true
    return [
      lead.full_name,
      lead.firstname,
      lead.lastname,
      lead.email,
      lead.phone,
      lead.neighbourhood,
      lead.property_type,
      lead.source
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
      fetchDuplicateHistory()
    } else {
      setDuplicateHistory([])
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
          firstname: selectedLead.firstname || selectedLead.full_name?.split(' ')[0] || '',
          lastname: selectedLead.lastname || selectedLead.full_name?.split(' ').slice(1).join(' ') || '',
          currentTable: 'rental_leads',
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

  const handleUpdateTemperature = async (leadId: string, temperature: string) => {
    setUpdatingTemperature(true)

    try {
      const response = await fetch('/api/leads/update-temperature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'rental_leads',
          leadId: leadId,
          temperature: temperature
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update temperature')
      }

      const data = await response.json()
      
      setLeads(prev =>
        prev.map(lead => (lead.id === leadId ? { ...lead, lead_temperature: temperature } : lead))
      )

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
          table: 'rental_leads',
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
      const updatedLead = normalizeLeadRecord(payload.lead as RentalLead)

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
          leadName: getDisplayName(selectedLead),
          leadId: selectedLead.id,
          leadTable: 'rental_leads'
        })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody?.error || 'Unable to send SMS right now. Please try again.')
      }

      setSmsSuccess('SMS sent successfully!')
      setSmsMessage('')
      
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
    const headers = ['First Name', 'Last Name', 'Full Name', 'Email', 'Phone', 'Neighbourhood', 'Property Type', 'Bedrooms', 'Budget', 'Move In Date', 'Status', 'Date']
    const csvData = filteredLeads.map(l => [
      l.firstname || '',
      l.lastname || '',
      l.full_name || '',
      l.email,
      l.phone,
      l.neighbourhood || 'N/A',
      l.property_type || 'N/A',
      l.bedrooms || 'N/A',
      l.budget || 0,
      l.move_in_date || 'N/A',
      l.status,
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
    a.download = `rental-leads-${new Date().toISOString().split('T')[0]}.csv`
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
          table: 'rental_leads',
          leadIds: leadIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete leads')
      }

      setLeads(prev => prev.filter(lead => !leadIds.includes(lead.id)))
      setSelectedLeadIds(new Set())
      
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

  const handleSendApplication = async (lead: RentalLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    
    const name = getDisplayName(lead)
    if (!confirm(`Send rental application to ${name} (${lead.email})?`)) {
      return
    }

    setSendingApplication(true)

    try {
      const response = await fetch('/api/rental-leads/send-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: lead.id,
          email: lead.email,
          name: name
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send application')
      }

      setApplicationSentLeads(prev => new Set(prev).add(lead.id))
      alert(`✅ Rental application sent successfully to ${name}!`)
    } catch (error) {
      console.error('Error sending application:', error)
      alert('❌ Failed to send application. Please try again.')
    } finally {
      setSendingApplication(false)
    }
  }

  if (loading) {
    return <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8"><div className="animate-pulse">Loading...</div></div>
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rental Leads</h1>
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
              placeholder="Search by name, email, phone, neighbourhood..."
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
            className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            All ({leads.length})
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-4 py-2 rounded-lg ${filter === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
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
          <button
            onClick={() => setFilter('has_pets')}
            className={`px-4 py-2 rounded-lg ${filter === 'has_pets' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Has Pets ({leads.filter(l => l.has_pets).length})
          </button>
        </div>
      </div>

      {/* Table View */}
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
                <th className="px-6 py-3">App</th>
                <th className="px-6 py-3">First Name</th>
                <th className="px-6 py-3">Last Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Neighbourhood</th>
                <th className="px-6 py-3">Property Type</th>
                <th className="px-6 py-3">Bedrooms</th>
                <th className="px-6 py-3">Budget</th>
                <th className="px-6 py-3">Move In Date</th>
                <th className="px-6 py-3">Calls</th>
                <th className="px-6 py-3">Temperature</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Received</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="cursor-pointer hover:bg-blue-50/60 transition-colors"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.has(lead.id)}
                      onChange={() => handleToggleSelect(lead.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleSendApplication(lead, e)}
                      disabled={sendingApplication}
                      className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
                        applicationSentLeads.has(lead.id) 
                          ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                      }`}
                      title={applicationSentLeads.has(lead.id) ? 'Application sent ✓' : 'Send rental application'}
                    >
                      {applicationSentLeads.has(lead.id) ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{lead.firstname || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{lead.lastname || '—'}</td>
                  <td className="px-6 py-4 text-sm text-blue-600 underline-offset-2 hover:underline">{lead.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{lead.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{lead.neighbourhood || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{lead.property_type || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{lead.bedrooms || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">${lead.budget?.toLocaleString() || '0'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{lead.move_in_date || '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
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
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-6 py-12 text-center text-sm text-gray-500">
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
                  {getDisplayName(selectedLead)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Rental Lead · {formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                {(selectedLead.firstname || selectedLead.lastname) && (
                  <>
                    {selectedLead.firstname && (
                      <div className="flex items-center text-gray-700">
                        <User className="mr-3 h-4 w-4 text-gray-400" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">First Name:</span>
                        <span>{selectedLead.firstname}</span>
                      </div>
                    )}
                    {selectedLead.lastname && (
                      <div className="flex items-center text-gray-700">
                        <User className="mr-3 h-4 w-4 text-gray-400" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Last Name:</span>
                        <span>{selectedLead.lastname}</span>
                      </div>
                    )}
                  </>
                )}
                {selectedLead.full_name && (
                  <div className="flex items-center text-gray-700">
                    <User className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Full Name:</span>
                    <span>{selectedLead.full_name}</span>
                  </div>
                )}
                {!selectedLead.firstname && !selectedLead.lastname && !selectedLead.full_name && (
                  <div className="flex items-center text-gray-700">
                    <User className="mr-3 h-4 w-4 text-gray-400" />
                    <span>—</span>
                  </div>
                )}
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
                <div className="flex items-center text-gray-700">
                  <MapPin className="mr-3 h-4 w-4 text-gray-400" />
                  <span>{selectedLead.neighbourhood || '—'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Home className="mr-3 h-4 w-4 text-gray-400" />
                  <span>{selectedLead.property_type || '—'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Bedrooms:</span>
                  <span>{selectedLead.bedrooms || '—'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <DollarSign className="mr-3 h-4 w-4 text-gray-400" />
                  <span>${selectedLead.budget?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Calendar className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Move In: {selectedLead.move_in_date || '—'}</span>
                </div>
                {selectedLead.features && selectedLead.features.length > 0 && (
                  <div className="flex items-start text-gray-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24 mt-1">Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.features.map((feature, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center text-gray-700">
                  <CreditCard className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Credit: {selectedLead.credit_score || '—'}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Users className="mr-3 h-4 w-4 text-gray-400" />
                  <span>Occupants: {selectedLead.occupants || '—'}</span>
                </div>
                {selectedLead.has_pets && (
                  <div className="flex items-center text-gray-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Pets:</span>
                    <span>{selectedLead.pet_details || 'Yes'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Calls Logged</span>
                  <div className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
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
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {logging ? 'Saving…' : 'Log Call'}
                    </button>
                  </div>
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
                      placeholder="Type your SMS message here..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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

                <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Send Rental Application</span>
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-gray-600">
                      Send the official OREA Rental Application Form 410 to this lead via email.
                    </p>
                    {applicationSentLeads.has(selectedLead.id) && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-xs text-green-700 font-semibold flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          Application already sent to this lead
                        </p>
                      </div>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleSendApplication(selectedLead)
                      }}
                      disabled={sendingApplication || !selectedLead.email}
                      className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {sendingApplication ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Application...
                        </>
                      ) : applicationSentLeads.has(selectedLead.id) ? (
                        <>
                          <FileText className="h-4 w-4" />
                          Resend Application
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Application
                        </>
                      )}
                    </button>
                    {!selectedLead.email && (
                      <p className="text-xs text-gray-500 text-center">No email address available</p>
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
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source</span>
                  <div className="mt-2 text-gray-700">{selectedLead.source || '—'}</div>
                </div>
              </div>
            </div>

            {selectedLead.notes && (
              <div className="border-t border-gray-100 px-6 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</span>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {selectedLead.notes}
                </p>
              </div>
            )}

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
                        <div>Status: <span className="font-medium">{duplicate.status || 'N/A'}</span></div>
                        {duplicate.call_count > 0 && (
                          <div>📞 Calls Logged: <span className="font-medium">{duplicate.call_count}</span></div>
                        )}
                        {duplicate.last_note && (
                          <div className="mt-2 pt-2 border-t border-orange-200">
                            <span className="font-medium">Last Note:</span> {duplicate.last_note}
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

            {/* Application History Section */}
            {selectedLead.application_history && selectedLead.application_history.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rental Application History</span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    Sent {selectedLead.application_sent_count || 0}x
                  </span>
                </div>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                  {selectedLead.application_history.map((entry, index) => (
                    <div key={`${entry.sent_at}-${index}`} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">Application Sent</span>
                        </div>
                        <span className="text-xs text-blue-600">
                          {formatDistanceToNow(new Date(entry.sent_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        <p>📧 To: {entry.sent_to}</p>
                        <p>👤 By: {entry.sent_by}</p>
                        <p>📅 {new Date(entry.sent_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show status if application never sent */}
            {(!selectedLead.application_sent || !selectedLead.application_history || selectedLead.application_history.length === 0) && (
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rental Application</span>
                </div>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Application not sent yet</p>
                  <p className="text-xs text-gray-500 mt-1">Use the "Send Application" button above</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

