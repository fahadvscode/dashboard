'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calendar, Download, Mail, Phone, User, Trash2, X, Clock, Tag, MapPin, Link as LinkIcon, MessageSquare } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import BookingReschedulePanel from '@/components/BookingReschedulePanel'

interface Booking {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  message: string
  status: string
  priority: string
  created_at: string
  project_name?: string | null
  project_id?: string | null
  redirect_link?: string | null
  project_url?: string | null
  url?: string | null
}

export default function GTALowriseBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [smsSuccess, setSmsSuccess] = useState('')

  useEffect(() => {
    fetchBookings()
  }, [])

  async function fetchBookings() {
    try {
      const { data, error } = await supabase
        .from('gta_lowrise_bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched bookings:', data?.[0]) // Debug: log first booking to see all columns
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Date', 'Time', 'Type', 'Status']
    const csvData = bookings.map(b => [
      `${b.firstname} ${b.lastname}`,
      b.email,
      b.phone,
      b.appointment_date,
      b.appointment_time,
      b.appointment_type,
      b.status
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gta-lowrise-bookings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleToggleSelect = (bookingId: string) => {
    const newSelected = new Set(selectedBookingIds)
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId)
    } else {
      newSelected.add(bookingId)
    }
    setSelectedBookingIds(newSelected)
  }

  const handleToggleSelectAll = () => {
    if (selectedBookingIds.size === bookings.length) {
      setSelectedBookingIds(new Set())
    } else {
      setSelectedBookingIds(new Set(bookings.map(booking => booking.id)))
    }
  }

  const handleDeleteBookings = async (bookingIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${bookingIds.length} booking(s)? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/bookings/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: 'gta_lowrise_bookings',
          bookingIds: bookingIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete bookings')
      }

      // Remove deleted bookings from state
      setBookings(prev => prev.filter(booking => !bookingIds.includes(booking.id)))
      setSelectedBookingIds(new Set())
    } catch (error) {
      console.error('Error deleting bookings:', error)
      alert('Failed to delete bookings. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    handleDeleteBookings([bookingId])
  }

  useEffect(() => {
    if (selectedBooking) {
      setSmsMessage('')
      setSmsError('')
      setSmsSuccess('')
    }
  }, [selectedBooking])

  const handleSendSms = async () => {
    if (!selectedBooking || !smsMessage.trim()) return

    setSendingSms(true)
    setSmsError('')
    setSmsSuccess('')

    try {
      const response = await fetch('/api/bookings/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: selectedBooking.phone,
          message: smsMessage.trim(),
          bookingName: `${selectedBooking.firstname} ${selectedBooking.lastname}`,
          bookingId: selectedBooking.id,
          bookingTable: 'gta_lowrise_bookings'
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

  const handleRescheduled = (updated: { appointment_date: string; appointment_time: string }) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === selectedBooking?.id
          ? { ...booking, ...updated }
          : booking
      )
    )
    setSelectedBooking((prev) => (prev ? { ...prev, ...updated } : prev))
  }

  const handleCancelled = (updated: { status: string }) => {
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === selectedBooking?.id
          ? { ...booking, ...updated }
          : booking
      )
    )
    setSelectedBooking((prev) => (prev ? { ...prev, ...updated } : prev))
  }

  if (loading) {
    return <div className="p-8"><div className="animate-pulse">Loading...</div></div>
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GTA Lowrise Bookings</h1>
          <p className="text-gray-600 mt-2">{bookings.length} total appointments</p>
        </div>
        <div className="flex gap-2">
          {selectedBookingIds.size > 0 && (
            <button
              onClick={() => handleDeleteBookings(Array.from(selectedBookingIds))}
              disabled={deleting}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedBookingIds.size})
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {bookings.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={bookings.length > 0 && selectedBookingIds.size === bookings.length}
            onChange={handleToggleSelectAll}
            className="cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            Select all ({selectedBookingIds.size} selected)
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookings.map((booking) => (
          <div 
            key={booking.id} 
            onClick={() => setSelectedBooking(booking)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="absolute top-3 right-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedBookingIds.has(booking.id)}
                onChange={() => handleToggleSelect(booking.id)}
                className="cursor-pointer"
              />
              <button
                onClick={(e) => handleDeleteSingle(booking.id, e)}
                disabled={deleting}
                className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-50"
                title="Delete booking"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-start justify-between mb-3 pr-20">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">{booking.firstname} {booking.lastname}</h3>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <span className="truncate">{booking.email}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                <span>{booking.phone}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{booking.appointment_date} at {booking.appointment_time}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                <span className="font-medium">Type:</span> {booking.appointment_type}
              </div>
              {booking.message && (
                <div className="text-xs text-gray-500 mt-2">
                  <span className="font-medium">Message:</span> {booking.message.substring(0, 100)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-50 bg-white">
              <button
                onClick={() => setSelectedBooking(null)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 hover:scale-110 border-2 border-white"
                aria-label="Close booking details"
              >
                <X className="h-5 w-5 stroke-[3]" />
              </button>
            </div>

            <div className="flex items-start justify-between border-b border-gray-100 px-6 pt-5 pb-4 pr-16">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedBooking.firstname} {selectedBooking.lastname}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Booking · {formatDistanceToNow(new Date(selectedBooking.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-gray-700">
                  <User className="mr-3 h-4 w-4 text-gray-400" />
                  <span>{selectedBooking.firstname} {selectedBooking.lastname}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <Mail className="mr-3 h-4 w-4 text-gray-400" />
                  <a href={`mailto:${selectedBooking.email}`} className="text-blue-600 underline-offset-2 hover:underline">
                    {selectedBooking.email}
                  </a>
                </div>
                <div className="flex items-center text-gray-700">
                  <Phone className="mr-3 h-4 w-4 text-gray-400" />
                  <a href={`tel:${selectedBooking.phone}`} className="text-gray-700 hover:text-gray-900">
                    {selectedBooking.phone || '—'}
                  </a>
                </div>
                <div className="flex items-center text-gray-700">
                  <Calendar className="mr-3 h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">Date: {selectedBooking.appointment_date}</div>
                    <div className="text-xs text-gray-500">Time: {selectedBooking.appointment_time}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-700">
                  <Clock className="mr-3 h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Created:</span>
                  <span>{formatDistanceToNow(new Date(selectedBooking.created_at), { addSuffix: true })}</span>
                </div>
                {selectedBooking.project_name && (
                  <div className="flex items-center text-gray-700">
                    <MapPin className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Project:</span>
                    <span>{selectedBooking.project_name}</span>
                  </div>
                )}
                {selectedBooking.project_id && (
                  <div className="flex items-center text-gray-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Project ID:</span>
                    <span>{selectedBooking.project_id}</span>
                  </div>
                )}
                {(selectedBooking.redirect_link || selectedBooking.project_url || selectedBooking.url) && (
                  <div className="flex items-center text-gray-700">
                    <LinkIcon className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-3 w-24">Project URL:</span>
                    <a 
                      href={selectedBooking.redirect_link || selectedBooking.project_url || selectedBooking.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline truncate"
                    >
                      {selectedBooking.redirect_link || selectedBooking.project_url || selectedBooking.url}
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(selectedBooking.status)}`}>
                      {selectedBooking.status || '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Appointment Type</span>
                  <div className="mt-2 flex items-center text-gray-700">
                    <Tag className="mr-2 h-4 w-4 text-gray-400" />
                    <span>{selectedBooking.appointment_type || '—'}</span>
                  </div>
                </div>
                {selectedBooking.priority && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Priority</span>
                    <div className="mt-2 text-gray-700">{selectedBooking.priority}</div>
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Appointment Date & Time</span>
                  <div className="mt-2 text-gray-700">
                    <div className="font-medium">{selectedBooking.appointment_date}</div>
                    <div className="text-sm text-gray-500">at {selectedBooking.appointment_time}</div>
                  </div>
                </div>
              </div>
            </div>

            {selectedBooking.message && (
              <div className="border-t border-gray-100 px-6 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</span>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {selectedBooking.message}
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 px-6 py-4">
              <BookingReschedulePanel
                booking={selectedBooking}
                table="gta_lowrise_bookings"
                onRescheduled={handleRescheduled}
                onCancelled={handleCancelled}
              />
            </div>

            {/* Send SMS Section */}
            <div className="border-t border-gray-100 px-6 py-4">
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
                    onClick={handleSendSms}
                    disabled={sendingSms || !smsMessage.trim() || !selectedBooking.phone}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {sendingSms ? 'Sending…' : 'Send SMS'}
                  </button>
                  {!selectedBooking.phone && (
                    <p className="text-xs text-gray-500 text-center">No phone number available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Booking ID: {selectedBooking.id}</span>
                <span>Created: {format(new Date(selectedBooking.created_at), 'PPpp')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

