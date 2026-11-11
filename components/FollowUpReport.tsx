'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FollowUpReport as Report } from '@/lib/followUpReport'

function torontoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function talkLabel(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function FollowUpReport({
  accessCode,
  onUnauthorized,
}: {
  accessCode: string
  onUnauthorized: () => void
}) {
  const [day, setDay] = useState(torontoToday)
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const unauthorizedRef = useRef(onUnauthorized)
  unauthorizedRef.current = onUnauthorized

  const load = useCallback(async (selectedDay: string) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/broker-guide/follow-up?date=${selectedDay}`, {
        headers: { 'x-broker-code': accessCode },
        cache: 'no-store',
      })
      if (response.status === 401) {
        unauthorizedRef.current()
        return
      }
      const body = (await response.json().catch(() => ({}))) as Report & { error?: string | null }
      if (!response.ok) throw new Error(body.error || 'Could not read the follow-up report.')
      setReport(body)
    } catch (loadError) {
      setReport(null)
      setError(loadError instanceof Error ? loadError.message : 'Could not read the follow-up report.')
    } finally {
      setLoading(false)
    }
  }, [accessCode])

  useEffect(() => {
    void load(day)
  }, [day, load])

  return (
    <section className="text-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Follow-up</h2>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">Calls, texts, leads, and appointments for the day you pick.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600" htmlFor="follow-up-day">Day</label>
          <input
            id="follow-up-day"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-base sm:flex-none sm:text-sm"
          />
          <button
            type="button"
            onClick={() => void load(day)}
            disabled={loading}
            className="min-h-11 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading && <p className="text-sm text-slate-500">Reading the day…</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {report && (
          <div className="space-y-4">
            {report.error && <p className="text-sm text-amber-800">{report.error}</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Calls" value={report.calls.toLocaleString('en-CA')} />
              <Stat label="Talk time" value={talkLabel(report.talkSeconds)} />
              <Stat label="Incoming calls" value={report.incoming.toLocaleString('en-CA')} />
              <Stat label="Texts" value={report.texts.toLocaleString('en-CA')} />
              <Stat label="Leads" value={report.leads.toLocaleString('en-CA')} />
              <Stat label="Inquiries" value={report.inquiries.toLocaleString('en-CA')} />
              <Stat label="Appointments" value={report.appointments.toLocaleString('en-CA')} />
            </div>
            {report.leadPages.length > 0 && (
              <p className="text-sm text-slate-500">
                {report.leadPages.map((page) => `${page.name} ${page.count}`).join(' · ')}
              </p>
            )}
            {report.people.length === 0 && report.leads === 0 && report.inquiries === 0 && (
              <p className="text-sm text-slate-500">Nothing recorded for this day.</p>
            )}
            <div className="space-y-3">
              {report.people.map((person) => (
                <div key={person.name} className="border-t border-slate-100 pt-3">
                  <div className="font-semibold">{person.name}</div>
                  <p className="mt-1 text-sm text-slate-600">
                    {person.calls} calls · {talkLabel(person.talkSeconds)}
                    {' · '}{person.incoming} incoming
                    {' · '}{person.texts} texts
                    {person.inquiries > 0 ? ` · ${person.inquiries} inquiries` : ''}
                    {' · '}{person.appointments.length} appointments
                  </p>
                  {person.appointments.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-500">
                      {person.appointments.map((appointment, index) => (
                        <li key={`${appointment.project}-${appointment.time}-${index}`}>
                          {appointment.project}{appointment.time ? `, ${appointment.time}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
