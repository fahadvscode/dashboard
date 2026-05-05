'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageSquare, Phone, User, Clock, Send, RefreshCw, X, Mail, MapPin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Conversation {
  id: string
  message_sid: string
  from_phone: string
  to_phone: string
  message_body: string
  direction: 'inbound' | 'outbound'
  status: string
  lead_name: string | null
  lead_id: string | null
  lead_table: string | null
  created_at: string
}

interface LeadDetails {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  project_name: string | null
  source: string | null
  message: string | null
  status: string | null
  created_at: string
}

interface GroupedConversation {
  phone: string
  leadName: string | null
  leadId: string | null
  leadTable: string | null
  leadSource: string | null
  projectName: string | null
  messages: Conversation[]
  lastMessage: Conversation
  unreadCount: number
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<LeadDetails | null>(null)
  const [showLeadModal, setShowLeadModal] = useState(false)

  const twilioNumber = '+16475580012'

  useEffect(() => {
    fetchConversations()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('sms_conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_conversations'
        },
        (payload) => {
          console.log('Real-time update:', payload)
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_conversations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setConversations(data || [])
      groupConversationsByPhone(data || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const normalizePhone = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    // If it's 11 digits and starts with 1, remove the 1
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(1)
    }
    // If it's 10 digits, return as is
    if (digits.length === 10) {
      return digits
    }
    // Otherwise return the digits
    return digits
  }

  const formatPhoneDisplay = (phone: string): string => {
    const normalized = normalizePhone(phone)
    // Format as (XXX) XXX-XXXX
    if (normalized.length === 10) {
      return `(${normalized.substring(0, 3)}) ${normalized.substring(3, 6)}-${normalized.substring(6)}`
    }
    return phone
  }

  const groupConversationsByPhone = async (convos: Conversation[]) => {
    const grouped = new Map<string, GroupedConversation>()

    convos.forEach((convo) => {
      // The "other" phone is either from_phone (if inbound) or to_phone (if outbound)
      const rawPhone = convo.direction === 'inbound' ? convo.from_phone : convo.to_phone
      const otherPhone = normalizePhone(rawPhone)
      
      if (!grouped.has(otherPhone)) {
        grouped.set(otherPhone, {
          phone: otherPhone,
          leadName: convo.lead_name,
          leadId: convo.lead_id,
          leadTable: convo.lead_table,
          leadSource: null,
          projectName: null,
          messages: [],
          lastMessage: convo,
          unreadCount: 0
        })
      }

      const group = grouped.get(otherPhone)!
      group.messages.push(convo)
      
      // Update lead info if available
      if (convo.lead_name && !group.leadName) {
        group.leadName = convo.lead_name
      }
      if (convo.lead_id && !group.leadId) {
        group.leadId = convo.lead_id
      }
      if (convo.lead_table && !group.leadTable) {
        group.leadTable = convo.lead_table
      }
      
      // Update last message if this is more recent
      if (new Date(convo.created_at) > new Date(group.lastMessage.created_at)) {
        group.lastMessage = convo
      }

      // Count unread (inbound messages)
      if (convo.direction === 'inbound') {
        group.unreadCount++
      }
    })

    // Fetch additional lead details
    const groupsArray = Array.from(grouped.values())
    for (const group of groupsArray) {
      if (group.leadId && group.leadTable) {
        try {
          const { data } = await supabase
            .from(group.leadTable)
            .select('project_name, source')
            .eq('id', group.leadId)
            .single()
          
          if (data) {
            const leadData = data as { project_name?: string; source?: string }
            group.projectName = leadData.project_name || leadData.source || null
            group.leadSource = group.leadTable === 'fj_leads' ? 'FJ Leads' : 'Precon Factory'
          }
        } catch (error) {
          console.error('Error fetching lead details:', error)
        }
      }
    }

    // Sort by most recent message
    const sorted = groupsArray.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    )

    setGroupedConversations(sorted)
  }

  const fetchLeadDetails = async (leadId: string, leadTable: string) => {
    try {
      const { data, error } = await supabase
        .from(leadTable)
        .select('*')
        .eq('id', leadId)
        .single()

      if (error) throw error
      setSelectedLeadDetails(data)
      setShowLeadModal(true)
    } catch (error) {
      console.error('Error fetching lead details:', error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchConversations()
  }

  const selectedConversation = groupedConversations.find(c => c.phone === selectedPhone)
  const selectedMessages = selectedConversation?.messages.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  const handleSendReply = async () => {
    if (!selectedPhone || !replyMessage.trim()) return

    setSending(true)

    try {
      const response = await fetch('/api/leads/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedPhone,
          message: replyMessage.trim(),
          leadName: selectedConversation?.leadName,
          leadId: selectedConversation?.messages[0]?.lead_id,
          leadTable: selectedConversation?.messages[0]?.lead_table
        })
      })

      if (!response.ok) throw new Error('Failed to send')

      setReplyMessage('')
      // The real-time subscription will update the UI
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SMS Conversations</h1>
              <p className="text-sm text-gray-600">{groupedConversations.length} conversations</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversations List */}
        <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
          {groupedConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Send your first SMS to get started</p>
            </div>
          ) : (
            groupedConversations.map((convo) => (
              <button
                key={convo.phone}
                onClick={() => setSelectedPhone(convo.phone)}
                className={`w-full p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                  selectedPhone === convo.phone ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {convo.leadId && convo.leadTable ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            fetchLeadDetails(convo.leadId!, convo.leadTable!)
                          }}
                          className="font-semibold text-gray-900 hover:text-blue-600 underline-offset-2 hover:underline text-left truncate block w-full"
                        >
                          {convo.leadName || 'Unknown Lead'}
                        </button>
                      ) : (
                        <p className="font-semibold text-gray-900 truncate">
                          {convo.leadName || 'Unknown Lead'}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">{formatPhoneDisplay(convo.phone)}</p>
                      {convo.leadSource && (
                        <p className="text-xs text-blue-600 font-medium">{convo.leadSource}</p>
                      )}
                      {convo.projectName && (
                        <p className="text-xs text-gray-500 truncate">Project: {convo.projectName}</p>
                      )}
                    </div>
                  </div>
                  {convo.unreadCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 truncate mb-1">
                  {convo.lastMessage.direction === 'inbound' && '← '}
                  {convo.lastMessage.direction === 'outbound' && '→ '}
                  {convo.lastMessage.message_body}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(convo.lastMessage.created_at), { addSuffix: true })}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Messages View */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedPhone ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedConversation?.leadName || 'Unknown Lead'}
                    </p>
                    <p className="text-sm text-gray-600">{formatPhoneDisplay(selectedPhone)}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message_body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-600'
                        }`}
                      >
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-3">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendReply()
                      }
                    }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyMessage.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      {showLeadModal && selectedLeadDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-50 bg-white">
              <button
                onClick={() => setShowLeadModal(false)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 hover:scale-110 border-2 border-white"
                aria-label="Close lead details"
              >
                <X className="h-5 w-5 stroke-[3]" />
              </button>
            </div>

            <div className="flex items-start justify-between border-b border-gray-100 px-6 pt-5 pb-4 pr-16">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedLeadDetails.firstname} {selectedLeadDetails.lastname}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDistanceToNow(new Date(selectedLeadDetails.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-gray-700">
                  <User className="mr-3 h-4 w-4 text-gray-400" />
                  <span>{selectedLeadDetails.firstname} {selectedLeadDetails.lastname}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Mail className="mr-3 h-4 w-4 text-gray-400" />
                  <a href={`mailto:${selectedLeadDetails.email}`} className="text-blue-600 underline-offset-2 hover:underline">
                    {selectedLeadDetails.email}
                  </a>
                </div>
                <div className="flex items-center text-gray-700">
                  <Phone className="mr-3 h-4 w-4 text-gray-400" />
                  <a href={`tel:${selectedLeadDetails.phone}`} className="text-gray-700 hover:text-gray-900">
                    {formatPhoneDisplay(selectedLeadDetails.phone) || '—'}
                  </a>
                </div>
                {(selectedLeadDetails.project_name || selectedLeadDetails.source) && (
                  <div className="flex items-center text-gray-700">
                    <MapPin className="mr-3 h-4 w-4 text-gray-400" />
                    <span>{selectedLeadDetails.project_name || selectedLeadDetails.source}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
                  <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${selectedLeadDetails.status === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedLeadDetails.status || '—'}
                  </div>
                </div>
              </div>
            </div>

            {selectedLeadDetails.message && (
              <div className="border-t border-gray-100 px-6 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</span>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {selectedLeadDetails.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

