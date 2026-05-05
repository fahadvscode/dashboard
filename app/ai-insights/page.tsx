'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Brain, TrendingUp, Loader2, RefreshCw, User, Mail, Phone, MapPin, Calendar, AlertCircle, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

/** Avoid naming this `Lead` — that name can clash with JSX/intrinsic types and break `useState` inference. */
interface DashboardLead {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  message: string
  project_name: string
  source: string
  created_at: string
  isagent: boolean
  status: string
  lead_temperature: string | null
  project_id: string | null
  redirect_link: string | null
}

interface LeadWithAI extends DashboardLead {
  aiScore?: number
  aiInsights?: any
  aiRecommendations?: any[]
  analyzing?: boolean
  analyzed?: boolean
}

export default function AILeadInsights() {
  const [fjLeads, setFjLeads] = useState<LeadWithAI[]>([])
  const [preconLeads, setPreconLeads] = useState<LeadWithAI[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'fj' | 'precon'>('all')
  const [selectedLead, setSelectedLead] = useState<LeadWithAI | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      // Fetch FJ leads
      const { data: fj, error: fjError } = await supabase
        .from('fj_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (fjError) throw fjError

      // Fetch Precon leads
      const { data: precon, error: preconError } = await supabase
        .from('precon_factory_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (preconError) throw preconError

      setFjLeads((fj || []) as LeadWithAI[])
      setPreconLeads((precon || []) as LeadWithAI[])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeLeads = async (leads: LeadWithAI[], updateState: (leads: LeadWithAI[]) => void) => {
    const total = leads.length
    setProgress({ current: 0, total })

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]
      
      // Mark as analyzing
      updateState(leads.map((l, idx) => 
        idx === i ? { ...l, analyzing: true } : l
      ))

      try {
        // Analyze lead
        const analysisResponse = await fetch('/api/leads/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead })
        })

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          
          // Update lead with AI data
          updateState(leads.map((l, idx) => 
            idx === i ? { 
              ...l, 
              aiScore: analysisData.analysis.score,
              aiInsights: analysisData.analysis,
              analyzing: false,
              analyzed: true
            } : l
          ))
        } else {
          updateState(leads.map((l, idx) => 
            idx === i ? { ...l, analyzing: false, analyzed: false } : l
          ))
        }

        setProgress({ current: i + 1, total })
      } catch (error) {
        console.error('Error analyzing lead:', error)
        updateState(leads.map((l, idx) => 
          idx === i ? { ...l, analyzing: false, analyzed: false } : l
        ))
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const batchAnalyzeAll = async () => {
    setAnalyzing(true)
    
    // Analyze FJ leads
    await analyzeLeads(fjLeads, setFjLeads)
    
    // Analyze Precon leads
    await analyzeLeads(preconLeads, setPreconLeads)
    
    setAnalyzing(false)
  }

  const allLeads = [...fjLeads.map(l => ({ ...l, source: 'FJ' })), ...preconLeads.map(l => ({ ...l, source: 'Precon Factory' }))]
    .filter(l => {
      if (activeTab === 'fj') return l.source === 'FJ'
      if (activeTab === 'precon') return l.source === 'Precon Factory'
      return true
    })
    .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))

  const hotLeads = allLeads.filter(l => (l.aiScore || 0) >= 80)
  const warmLeads = allLeads.filter(l => (l.aiScore || 0) >= 50 && (l.aiScore || 0) < 80)
  const coldLeads = allLeads.filter(l => (l.aiScore || 0) < 50 || !l.analyzed)

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score >= 80) return 'bg-red-100 text-red-700 border-red-300'
    if (score >= 50) return 'bg-green-100 text-green-700 border-green-300'
    return 'bg-orange-100 text-orange-700 border-orange-300'
  }

  const getScoreBadge = (score?: number) => {
    if (!score) return '❄️ Not Analyzed'
    if (score >= 80) return '🔥 HOT'
    if (score >= 50) return '⭐ WARM'
    return '❄️ COLD'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Lead Insights</h1>
          </div>
          <p className="text-gray-600">Batch analyze leads, prioritize hot prospects, and close more deals</p>
        </div>

        {/* Stats Cards */}
        {allLeads.some(l => l.analyzed) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-red-900 uppercase">Hot Leads</span>
                <span className="text-3xl">🔥</span>
              </div>
              <div className="text-4xl font-bold text-red-700">{hotLeads.length}</div>
              <p className="text-xs text-red-600 mt-1">Score 80+ • Call ASAP</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-900 uppercase">Warm Leads</span>
                <span className="text-3xl">⭐</span>
              </div>
              <div className="text-4xl font-bold text-green-700">{warmLeads.length}</div>
              <p className="text-xs text-green-600 mt-1">Score 50-79 • Follow up soon</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-900 uppercase">Cold Leads</span>
                <span className="text-3xl">❄️</span>
              </div>
              <div className="text-4xl font-bold text-orange-700">{coldLeads.length}</div>
              <p className="text-xs text-orange-600 mt-1">Score &lt;50 • Nurture sequence</p>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={batchAnalyzeAll}
                disabled={analyzing || loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing... ({progress.current}/{progress.total})
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5" />
                    Analyze All Leads
                  </>
                )}
              </button>

              <button
                onClick={fetchLeads}
                disabled={loading}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'all' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({allLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('fj')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'fj' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                FJ ({fjLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('precon')}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeTab === 'precon' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Precon ({preconLeads.length})
              </button>
            </div>
          </div>
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allLeads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => window.location.href = lead.source === 'FJ' ? `/fj-leads?leadId=${lead.id}` : `/precon-leads?leadId=${lead.id}`}
                className={`bg-white rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${
                  lead.analyzing ? 'animate-pulse border-purple-300' : 
                  lead.analyzed ? getScoreColor(lead.aiScore).replace('text-', 'border-') : 'border-gray-200'
                } hover:scale-[1.02]`}
              >
                {/* Score Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getScoreColor(lead.aiScore)}`}>
                    {lead.analyzing ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </span>
                    ) : (
                      getScoreBadge(lead.aiScore)
                    )}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 uppercase">{lead.source}</span>
                </div>

                {/* Lead Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">
                      {lead.firstname} {lead.lastname}
                    </span>
                  </div>

                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 truncate">{lead.email}</span>
                    </div>
                  )}

                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{lead.phone}</span>
                    </div>
                  )}

                  {lead.project_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 truncate">{lead.project_name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* AI Insights Preview */}
                {lead.analyzed && lead.aiInsights && (
                  <div className="border-t border-gray-200 pt-3 space-y-1">
                    {lead.aiScore !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Score:</span>
                        <span className="text-lg font-bold">{lead.aiScore}/100</span>
                      </div>
                    )}
                    
                    {lead.aiInsights.insights?.urgency && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Urgency:</span>
                        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                          lead.aiInsights.insights.urgency === 'high' ? 'bg-red-100 text-red-700' :
                          lead.aiInsights.insights.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.aiInsights.insights.urgency}
                        </span>
                      </div>
                    )}

                    {lead.aiInsights.insights?.buyerType && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Type:</span>
                        <span className="text-xs font-medium text-gray-700">{lead.aiInsights.insights.buyerType}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button className="w-full text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center justify-center gap-1">
                        View Full Analysis →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && allLeads.length === 0 && (
          <div className="text-center py-20">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">Check back later or adjust your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

