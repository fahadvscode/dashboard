'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Download, Mail, Phone, User, MapPin, X, MessageSquare, Search, Sparkles, Loader2, Trash2, AlertCircle, Brain, TrendingUp, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import LeadDateRangeFilter from '@/components/LeadDateRangeFilter'
import {
  type LeadDatePreset,
  getLeadCreatedAtInterval,
  leadCreatedAtMatchesRange
} from '@/lib/leadDateRange'
import {
  ENCLAVE_LEADS_TABLE,
  HAWTHORNE_EAST_VILLAGE_TABLE,
  getLandingPageBrandLabel,
  hasLandingPageCrmColumns
} from '@/lib/landingPageLeads'

const PAGE_SOURCE_TABLES = new Set([ENCLAVE_LEADS_TABLE, HAWTHORNE_EAST_VILLAGE_TABLE])

type CallHistoryEntry = {
  outcome: string
  note: string
  timestamp: string
}

interface LandingPageLead {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  source: string // Supabase table name (e.g. enclave, rollingwood_leads)
  table_name: string // for API calls
  page_source?: string // UTM / form source column on enclave
  model?: string
  collection?: string
  form_name?: string
  status: string
  created_at: string
  call_count: number | null
  call_history: CallHistoryEntry[] | null
  last_note: string | null
  lead_temperature: string | null
  // Table-specific fields
  buyer_type?: string
  home_interest?: string
  is_realtor?: boolean
  interest?: string
  project?: string
  form_type?: string
  page_path?: string
  is_broker?: string | boolean
  utm_source?: string
  utm_campaign?: string
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

function normalizeLead(raw: Record<string, unknown>, tableName: string): LandingPageLead {
  const firstname = (raw.first_name ?? raw.firstname ?? '') as string
  const lastname = (raw.last_name ?? raw.lastname ?? '') as string
  return {
    id: raw.id as string,
    firstname,
    lastname,
    email: (raw.email ?? '') as string,
    phone: (raw.phone ?? '') as string,
    source: tableName,
    table_name: tableName,
    status: (raw.status ?? 'new') as string,
    created_at: (raw.created_at ?? new Date().toISOString()) as string,
    call_count: (raw.call_count ?? 0) as number,
    call_history: normalizeCallHistory(raw.call_history),
    last_note: (raw.last_note ?? null) as string | null,
    lead_temperature: (raw.lead_temperature ?? 'warm') as string | null,
    buyer_type: raw.buyer_type as string | undefined,
    home_interest: raw.home_interest as string | undefined,
    is_realtor: raw.is_realtor as boolean | undefined,
    interest: raw.interest as string | undefined,
    project: raw.project as string | undefined,
    page_source: PAGE_SOURCE_TABLES.has(tableName) ? (raw.source as string | undefined) : undefined,
    model: raw.model as string | undefined,
    collection: raw.collection as string | undefined,
    form_name: raw.form_name as string | undefined,
    form_type: raw.form_type as string | undefined,
    page_path: raw.page_path as string | undefined,
    is_broker: raw.is_broker as string | boolean | undefined,
    utm_source: raw.utm_source as string | undefined,
    utm_campaign: raw.utm_campaign as string | undefined
  }
}

function leadDetailLabel(lead: LandingPageLead): string {
  if (lead.table_name === ENCLAVE_LEADS_TABLE) {
    return [lead.model, lead.collection].filter(Boolean).join(' · ') || '—'
  }
  if (lead.table_name === 'lakeview_village_leads') {
    return [lead.project, lead.buyer_type].filter(Boolean).join(' · ') || '—'
  }
  if (lead.table_name === HAWTHORNE_EAST_VILLAGE_TABLE) {
    const broker =
      lead.is_broker !== undefined && lead.is_broker !== null && String(lead.is_broker).trim() !== ''
        ? `Broker: ${lead.is_broker}`
        : ''
    return [lead.form_type, broker].filter(Boolean).join(' · ') || '—'
  }
  return lead.buyer_type || lead.interest || lead.home_interest || '—'
}

export default function LandingPagesLeads() {
  const [leads, setLeads] = useState<LandingPageLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [datePreset, setDatePreset] = useState<LeadDatePreset>('all')
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [selectedLead, setSelectedLead] = useState<LandingPageLead | null>(null)
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
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([])
  const [loadingAiInsights, setLoadingAiInsights] = useState(false)
  const [showAiInsights, setShowAiInsights] = useState(false)

  async function fetchLeads() {
    try {
      const [cornerstoneRes, novellaRes, lakeviewRes, rollingwoodRes, enclaveRes, hawthorneRes] = await Promise.all([
        supabase.from('cornerstone_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('novella_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('lakeview_village_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('rollingwood_leads').select('*').order('created_at', { ascending: false }),
        supabase.from(ENCLAVE_LEADS_TABLE).select('*').order('created_at', { ascending: false }),
        supabase.from(HAWTHORNE_EAST_VILLAGE_TABLE).select('*').order('created_at', { ascending: false })
      ])

      const cornerstone = (cornerstoneRes.data || []).map(r => normalizeLead(r, 'cornerstone_leads'))
      const novella = (novellaRes.data || []).map(r => normalizeLead(r, 'novella_leads'))
      const lakeview = (lakeviewRes.data || []).map(r => normalizeLead(r, 'lakeview_village_leads'))
      const rollingwood = (rollingwoodRes.data || []).map(r => normalizeLead(r, 'rollingwood_leads'))
      const enclave = (enclaveRes.data || []).map(r => normalizeLead(r, ENCLAVE_LEADS_TABLE))
      const hawthorne = (hawthorneRes.data || []).map(r => normalizeLead(r, HAWTHORNE_EAST_VILLAGE_TABLE))
      const combined = [...cornerstone, ...novella, ...lakeview, ...rollingwood, ...enclave, ...hawthorne].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      if (cornerstoneRes.error) console.error('cornerstone_leads fetch:', cornerstoneRes.error)
      if (novellaRes.error) console.error('novella_leads fetch:', novellaRes.error)
      if (lakeviewRes.error) console.error('lakeview_village_leads fetch:', lakeviewRes.error)
      if (rollingwoodRes.error) console.error('rollingwood_leads fetch:', rollingwoodRes.error)
      if (enclaveRes.error) console.error('enclave fetch:', enclaveRes.error)
      if (hawthorneRes.error) console.error('hawthorne_east_village fetch:', hawthorneRes.error)

      setLeads(combined)
      setInitialLoadDone(true)
    } catch (error) {
      console.error('Error fetching landing page leads:', error)
    } finally {
      setLoading(false)
    }
  }

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
          window.history.replaceState({}, '', '/landing-pages-leads')
        }
      }
    }
  }, [initialLoadDone, leads])

  const dateInterval = useMemo(
    () => getLeadCreatedAtInterval(datePreset, customDateStart, customDateEnd),
    [datePreset, customDateStart, customDateEnd]
  )

  const filteredLeads = leads
    .filter(lead => {
      if (filter === 'all') return true
      if (filter === 'cornerstone') return lead.table_name === 'cornerstone_leads'
      if (filter === 'novella') return lead.table_name === 'novella_leads'
      if (filter === 'lakeview') return lead.table_name === 'lakeview_village_leads'
      if (filter === 'rollingwood') return lead.table_name === 'rollingwood_leads'
      if (filter === 'enclave') return lead.table_name === ENCLAVE_LEADS_TABLE
      if (filter === 'hawthorne') return lead.table_name === HAWTHORNE_EAST_VILLAGE_TABLE
      if (filter === 'new') return lead.status === 'new'
      if (filter === 'hot') return lead.lead_temperature === 'hot'
      if (filter === 'warm') return lead.lead_temperature === 'warm'
      if (filter === 'cold') return lead.lead_temperature === 'cold'
      return true
    })
    .filter(lead => leadCreatedAtMatchesRange(lead.created_at, dateInterval))
    .filter(lead => {
      const q = searchTerm.trim().toLowerCase()
      if (!q) return true
      return [
        lead.firstname,
        lead.lastname,
        lead.email,
        lead.phone,
        lead.source,
        lead.page_source,
        lead.model,
        lead.collection,
        lead.form_name,
        lead.form_type,
        lead.page_path,
        lead.is_broker !== undefined && lead.is_broker !== null ? String(lead.is_broker) : '',
        getLandingPageBrandLabel(lead.table_name)
      ]
        .filter(Boolean)
        .some(v => (v as string).toLowerCase().includes(q))
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
      setAiAnalysis(null)
      setAiRecommendations([])
      setShowAiInsights(false)
      fetchDuplicateHistory()
      fetchAiInsights()
    } else {
      setDuplicateHistory([])
      setAiAnalysis(null)
      setAiRecommendations([])
    }
  }, [selectedLead])

  const fetchDuplicateHistory = async () => {
    if (!selectedLead || (!selectedLead.email && !selectedLead.phone)) return
    setLoadingDuplicates(true)
    try {
      const res = await fetch('/api/leads/duplicate-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedLead.email,
          phone: selectedLead.phone,
          firstname: selectedLead.firstname,
          lastname: selectedLead.lastname,
          currentTable: selectedLead.table_name,
          currentLeadId: selectedLead.id
        })
      })
      if (!res.ok) throw new Error('Failed to fetch duplicate history')
      const data = await res.json()
      setDuplicateHistory(data.duplicates || [])
    } catch (e) {
      console.error(e)
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
      const analysisRes = await fetch('/api/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead })
      })
      if (analysisRes.ok) {
        const d = await analysisRes.json()
        setAiAnalysis(d.analysis)
      }
      const recRes = await fetch('/api/leads/recommend-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead })
      })
      if (recRes.ok) {
        const d = await recRes.json()
        setAiRecommendations(d.recommendations || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingAiInsights(false)
    }
  }

  const handleUpdateTemperature = async (leadId: string, temperature: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    setUpdatingTemperature(true)
    try {
      const res = await fetch('/api/leads/update-temperature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: lead.table_name,
          leadId,
          temperature
        })
      })
      if (!res.ok) throw new Error('Failed to update temperature')
      setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, lead_temperature: temperature } : l)))
      if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, lead_temperature: temperature } : null)
    } catch (e) {
      console.error(e)
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
      const res = await fetch('/api/leads/log-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedLead.table_name,
          leadId: selectedLead.id,
          outcome: logOutcome,
          note: logNote.trim()
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to log call')
      }
      const payload = await res.json()
      const updated = {
        ...payload.lead,
        firstname: payload.lead.first_name ?? payload.lead.firstname,
        lastname: payload.lead.last_name ?? payload.lead.lastname,
        table_name: selectedLead.table_name,
        source: selectedLead.source
      }
      setLeads(prev => prev.map(l => (l.id === updated.id ? { ...l, ...updated } : l)))
      setSelectedLead(prev => (prev?.id === updated.id ? { ...prev, ...updated } : prev))
      setLogNote('')
      setLogOutcome(CALL_OUTCOMES[0])
    } catch (e) {
      setLogError(e instanceof Error ? e.message : 'Failed to log call')
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
      const res = await fetch('/api/leads/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedLead.phone,
          message: smsMessage.trim(),
          leadName: `${selectedLead.firstname} ${selectedLead.lastname}`,
          leadId: selectedLead.id,
          leadTable: selectedLead.table_name
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to send SMS')
      }
      setSmsSuccess('SMS sent successfully!')
      setSmsMessage('')
      setTimeout(() => setSmsSuccess(''), 3000)
    } catch (e) {
      setSmsError(e instanceof Error ? e.message : 'Failed to send SMS')
    } finally {
      setSendingSms(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Buyer Type', 'Status', 'Date']
    const rows = filteredLeads.map(l => [
      l.firstname,
      l.lastname,
      l.email,
      l.phone,
      l.source,
      l.buyer_type || l.interest || '—',
      l.status,
      l.created_at
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `landing-pages-leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleDeleteLeads = async (leadIds: string[]) => {
    if (!confirm(`Delete ${leadIds.length} lead(s)?`)) return
    setDeleting(true)
    try {
      const byTable = new Map<string, string[]>()
      for (const id of leadIds) {
        const lead = leads.find(l => l.id === id)
        if (lead) {
          const arr = byTable.get(lead.table_name) ?? []
          arr.push(id)
          byTable.set(lead.table_name, arr)
        }
      }
      for (const [table, ids] of byTable) {
        const res = await fetch('/api/leads/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, leadIds: ids })
        })
        if (!res.ok) throw new Error('Delete failed')
      }
      setLeads(prev => prev.filter(l => !leadIds.includes(l.id)))
      setSelectedLeadIds(new Set())
      if (selectedLead && leadIds.includes(selectedLead.id)) setSelectedLead(null)
    } catch (e) {
      console.error(e)
      alert('Failed to delete leads')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) setSelectedLeadIds(new Set())
    else setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)))
  }

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedLeadIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedLeadIds(next)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Landing Pages Leads</h1>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, or source"
              className="w-full pl-9 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
            onClick={() => setFilter('cornerstone')}
            className={`px-4 py-2 rounded-lg ${filter === 'cornerstone' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Cornerstone ({leads.filter(l => l.table_name === 'cornerstone_leads').length})
          </button>
          <button
            onClick={() => setFilter('novella')}
            className={`px-4 py-2 rounded-lg ${filter === 'novella' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Novella ({leads.filter(l => l.table_name === 'novella_leads').length})
          </button>
          <button
            onClick={() => setFilter('lakeview')}
            className={`px-4 py-2 rounded-lg ${filter === 'lakeview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Lakeview Village ({leads.filter(l => l.table_name === 'lakeview_village_leads').length})
          </button>
          <button
            onClick={() => setFilter('rollingwood')}
            className={`px-4 py-2 rounded-lg ${filter === 'rollingwood' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Rollingwood ({leads.filter(l => l.table_name === 'rollingwood_leads').length})
          </button>
          <button
            onClick={() => setFilter('enclave')}
            className={`px-4 py-2 rounded-lg ${filter === 'enclave' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Enclave ({leads.filter(l => l.table_name === ENCLAVE_LEADS_TABLE).length})
          </button>
          <button
            onClick={() => setFilter('hawthorne')}
            className={`px-4 py-2 rounded-lg ${filter === 'hawthorne' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Hawthorne ({leads.filter(l => l.table_name === HAWTHORNE_EAST_VILLAGE_TABLE).length})
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-4 py-2 rounded-lg ${filter === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            New ({leads.filter(l => l.status === 'new').length})
          </button>
          <button
            onClick={() => setFilter('hot')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${filter === 'hot' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Hot ({leads.filter(l => l.lead_temperature === 'hot').length})
          </button>
          <button
            onClick={() => setFilter('warm')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${filter === 'warm' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'}`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Warm ({leads.filter(l => l.lead_temperature === 'warm').length})
          </button>
          <button
            onClick={() => setFilter('cold')}
            className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${filter === 'cold' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700'}`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Cold ({leads.filter(l => l.lead_temperature === 'cold').length})
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
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
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Type / Interest</th>
              <th className="px-6 py-3">Calls</th>
              <th className="px-6 py-3">Temperature</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Received</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredLeads.map(lead => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="cursor-pointer hover:bg-blue-50/60 transition-colors"
              >
                <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
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
                <td className="px-6 py-4 text-sm">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    {getLandingPageBrandLabel(lead.table_name)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {leadDetailLabel(lead)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {hasLandingPageCrmColumns(lead.table_name) ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {lead.call_count ?? 0} Calls
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm" onClick={e => e.stopPropagation()}>
                  {hasLandingPageCrmColumns(lead.table_name) ? (
                    <select
                      value={lead.lead_temperature || 'warm'}
                      onChange={e => handleUpdateTemperature(lead.id, e.target.value)}
                      disabled={updatingTemperature}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${
                        LEAD_TEMPERATURES[lead.lead_temperature as keyof typeof LEAD_TEMPERATURES]?.color ?? LEAD_TEMPERATURES.warm.color
                      }`}
                    >
                      <option value="hot">🔴 Hot</option>
                      <option value="warm">🟢 Warm</option>
                      <option value="cold">🟠 Cold</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {lead.status || '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 text-sm" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleDeleteLeads([lead.id])
                    }}
                    disabled={deleting}
                    className="text-red-600 hover:text-red-800 p-1 rounded disabled:opacity-50"
                    title="Delete lead"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={12} className="px-6 py-12 text-center text-sm text-gray-500">
                  No leads match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-50 bg-white">
              <button
                onClick={() => setSelectedLead(null)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                aria-label="Close"
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
                  {getLandingPageBrandLabel(selectedLead.table_name)} · {formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true })}
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
                <div className="flex items-center text-gray-700">
                  <MapPin className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="font-medium">Landing Page:</span>
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    {getLandingPageBrandLabel(selectedLead.table_name)}
                  </span>
                </div>
                {selectedLead.table_name === ENCLAVE_LEADS_TABLE && (
                  <div className="flex flex-col gap-1 text-gray-700">
                    {selectedLead.collection && (
                      <p><span className="font-medium">Collection:</span> {selectedLead.collection}</p>
                    )}
                    {selectedLead.model && (
                      <p><span className="font-medium">Model:</span> {selectedLead.model}</p>
                    )}
                    {selectedLead.form_name && (
                      <p><span className="font-medium">Form:</span> {selectedLead.form_name}</p>
                    )}
                    {selectedLead.page_source && (
                      <p><span className="font-medium">Source:</span> {selectedLead.page_source}</p>
                    )}
                  </div>
                )}
                {selectedLead.table_name === HAWTHORNE_EAST_VILLAGE_TABLE && (
                  <div className="flex flex-col gap-1 text-gray-700">
                    {selectedLead.is_broker !== undefined &&
                      selectedLead.is_broker !== null &&
                      String(selectedLead.is_broker).trim() !== '' && (
                      <p><span className="font-medium">Broker:</span> {String(selectedLead.is_broker)}</p>
                    )}
                    {selectedLead.form_type && (
                      <p><span className="font-medium">Form:</span> {selectedLead.form_type}</p>
                    )}
                    {selectedLead.page_path && (
                      <p><span className="font-medium">Page:</span> {selectedLead.page_path}</p>
                    )}
                    {selectedLead.page_source && (
                      <p><span className="font-medium">Source:</span> {selectedLead.page_source}</p>
                    )}
                    {selectedLead.utm_source && (
                      <p><span className="font-medium">UTM:</span> {[selectedLead.utm_source, selectedLead.utm_campaign].filter(Boolean).join(' / ')}</p>
                    )}
                  </div>
                )}
                {(selectedLead.buyer_type || selectedLead.interest || selectedLead.home_interest || selectedLead.project) && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-500 w-24">Details:</span>
                    <span className="text-gray-700">
                      {[selectedLead.project, selectedLead.buyer_type, selectedLead.interest, selectedLead.home_interest].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                {hasLandingPageCrmColumns(selectedLead.table_name) ? (
                  <>
                    <div>
                      <span className="text-xs font-semibold uppercase text-gray-500">Calls</span>
                      <div className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {selectedLead.call_count ?? 0} Calls
                      </div>
                      {selectedLead.last_note && (
                        <p className="mt-2 text-xs text-gray-500">Last note: {selectedLead.last_note}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                      <span className="text-xs font-semibold uppercase text-gray-500">Log Call</span>
                      <div className="mt-3 space-y-3">
                        <select
                          value={logOutcome}
                          onChange={e => setLogOutcome(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        >
                          {CALL_OUTCOMES.map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <textarea
                          value={logNote}
                          onChange={e => setLogNote(e.target.value)}
                          placeholder="Add note (optional)"
                          rows={3}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        />
                        {logError && <p className="text-xs text-red-500">{logError}</p>}
                        <button
                          onClick={handleLogCall}
                          disabled={logging}
                          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {logging ? 'Saving…' : 'Log Call'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 rounded-lg border border-dashed border-gray-200 p-3">
                    Call logging and lead temperature are not enabled for this landing page until CRM columns are added to the table.
                  </p>
                )}
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase text-gray-500">Send SMS</span>
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value)}
                    placeholder="Type your SMS message..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-2"
                  />
                  {smsError && <p className="text-xs text-red-500 mb-2">{smsError}</p>}
                  {smsSuccess && <p className="text-xs text-green-600 font-semibold mb-2">{smsSuccess}</p>}
                  <button
                    onClick={handleSendSms}
                    disabled={sendingSms || !smsMessage.trim() || !selectedLead.phone}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {sendingSms ? 'Sending…' : 'Send SMS'}
                  </button>
                  {!selectedLead.phone && (
                    <p className="text-xs text-gray-500 mt-2">No phone number available</p>
                  )}
                </div>
                {hasLandingPageCrmColumns(selectedLead.table_name) && (
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">Lead Temperature</span>
                    <select
                      value={selectedLead.lead_temperature || 'warm'}
                      onChange={e => handleUpdateTemperature(selectedLead.id, e.target.value)}
                      disabled={updatingTemperature}
                      className={`mt-2 w-full text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer border ${
                        LEAD_TEMPERATURES[selectedLead.lead_temperature as keyof typeof LEAD_TEMPERATURES]?.color ?? LEAD_TEMPERATURES.warm.color
                      }`}
                    >
                      <option value="hot">🔴 Hot Lead</option>
                      <option value="warm">🟢 Warm Lead</option>
                      <option value="cold">🟠 Cold Lead</option>
                    </select>
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Status</span>
                  <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${selectedLead.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedLead.status || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Lead Intelligence */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-bold text-purple-900">🤖 AI Lead Intelligence</span>
                {loadingAiInsights && (
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                )}
              </div>
              {loadingAiInsights && (
                <p className="text-sm text-gray-600">Analyzing lead...</p>
              )}
              {!loadingAiInsights && aiAnalysis && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600">Lead Score</span>
                      <span className={`text-2xl font-bold ${
                        aiAnalysis.score >= 80 ? 'text-red-600' :
                        aiAnalysis.score >= 50 ? 'text-green-600' : 'text-orange-600'
                      }`}>{aiAnalysis.score}</span>
                    </div>
                    <p className="text-sm text-gray-700">{aiAnalysis.reasoning}</p>
                  </div>
                  {aiAnalysis.insights && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold text-gray-600">Key Insights</span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        {aiAnalysis.insights.buyerType && <div>Buyer: {aiAnalysis.insights.buyerType}</div>}
                        {aiAnalysis.insights.urgency && <div>Urgency: {aiAnalysis.insights.urgency}</div>}
                      </div>
                    </div>
                  )}
                  {aiRecommendations.length > 0 && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-semibold text-gray-600">Recommended Projects ({aiRecommendations.length})</span>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {aiRecommendations.slice(0, 5).map((rec: any) => (
                          <div key={rec.project?.id} className="rounded border border-green-200 bg-green-50/30 p-3">
                            <div className="font-semibold text-sm">{rec.project?.project_name}</div>
                            <p className="text-xs text-gray-600 mt-1">{rec.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {duplicateHistory.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-500">Duplicate Lead Detected</span>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {duplicateHistory.map((d, i) => (
                    <div key={d.id || i} className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-orange-700">{d.tableName}</span>
                        <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        {(d.firstname || d.first_name) || ''} {(d.lastname || d.last_name) || ''} · {d.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Call History</span>
                <span className="text-xs text-gray-400">{selectedHistory.length} entries</span>
              </div>
              {selectedHistory.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">No calls logged yet.</p>
              ) : (
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {selectedHistory.map((entry, i) => (
                    <div key={`${entry.timestamp}-${i}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-gray-700">{entry.outcome}</span>
                        <span className="text-gray-400">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                      </div>
                      {entry.note && <p className="mt-2 text-sm text-gray-600">{entry.note}</p>}
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
