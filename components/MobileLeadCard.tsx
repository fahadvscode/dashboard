'use client'

import { Phone, Mail, MapPin, Calendar, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Lead {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  project_name: string
  source: string
  status: string
  isagent: boolean
  created_at: string
  call_count: number | null
  lead_temperature: string | null
  project_id: string | null
  redirect_link: string | null
}

const LEAD_TEMPERATURES = {
  hot: { label: 'Hot', emoji: '🔴', color: 'bg-red-100 text-red-800' },
  warm: { label: 'Warm', emoji: '🟢', color: 'bg-green-100 text-green-800' },
  cold: { label: 'Cold', emoji: '🟠', color: 'bg-orange-100 text-orange-800' }
} as const

interface MobileLeadCardProps {
  lead: Lead
  onClick: () => void
}

export default function MobileLeadCard({ lead, onClick }: MobileLeadCardProps) {
  const project = lead.project_name || lead.source || 'N/A'
  const temperature = (lead.lead_temperature || 'warm') as keyof typeof LEAD_TEMPERATURES
  const tempConfig = LEAD_TEMPERATURES[temperature]
  
  return (
    <div
      onClick={onClick}
      className="mobile-card cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {lead.firstname} {lead.lastname}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex gap-2 ml-2 flex-shrink-0 flex-wrap justify-end">
          <span className={`badge text-xs font-semibold ${tempConfig.color}`}>
            {tempConfig.emoji} {tempConfig.label}
          </span>
          {lead.isagent ? (
            <span className="badge bg-purple-100 text-purple-800">Agent</span>
          ) : (
            <span className="badge bg-blue-100 text-blue-800">Buyer</span>
          )}
          <span className={`badge ${lead.status === 'new' ? 'badge-warning' : 'bg-gray-100 text-gray-800'}`}>
            {lead.status || '—'}
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm text-gray-700">
          <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{lead.email || '—'}</span>
        </div>
        <div className="flex items-center text-sm text-gray-700">
          <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
          <span>{lead.phone || '—'}</span>
        </div>
        <div className="flex items-center text-sm text-gray-700">
          <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">{project}</span>
        </div>
        {lead.project_id && (
          <div className="flex items-center text-sm text-gray-700">
            <span className="text-xs text-gray-500 mr-2">Project ID:</span>
            <span className="truncate">{lead.project_id}</span>
          </div>
        )}
        {lead.redirect_link && (
          <div className="flex items-center text-sm text-gray-700">
            <span className="text-xs text-gray-500 mr-2">Landing Page:</span>
            <a 
              href={lead.redirect_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 truncate underline"
              onClick={(e) => e.stopPropagation()}
            >
              {lead.redirect_link}
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-600">
          <MessageSquare className="h-3.5 w-3.5 mr-1" />
          <span className="font-medium">{lead.call_count || 0} calls</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            window.location.href = `tel:${lead.phone}`
          }}
          className="text-blue-600 text-sm font-medium hover:text-blue-700"
        >
          Call Now →
        </button>
      </div>
    </div>
  )
}

