'use client'

import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { FUB_BOOKING_BRANDS } from '@/lib/fubEmbeddedApp'
import type { FubProjectOption } from '@/lib/fubProjects'

export default function FubWorksheetPanel({
  context,
  signature,
  email,
  taggedProjects,
}: {
  context: string
  signature: string
  email: string
  taggedProjects: FubProjectOption[]
}) {
  const [brand, setBrand] = useState('fj')
  const [selected, setSelected] = useState<FubProjectOption | null>(taggedProjects.length === 1 ? taggedProjects[0] : null)
  const [changingProject, setChangingProject] = useState(taggedProjects.length !== 1)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<FubProjectOption[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const q = search.trim()
    if (q.length < 1) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await fetch('/api/fub/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, signature, q }),
        })
        const payload = await response.json()
        setSuggestions(Array.isArray(payload.projects) ? payload.projects : [])
      })()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search, context, signature])

  function chooseProject(project: FubProjectOption) {
    setSelected(project)
    setSearch('')
    setSuggestions([])
    setChangingProject(false)
  }

  async function sendWorksheet() {
    setError('')
    setNotice('')
    if (!selected?.id || !selected.project_name) {
      setError('Choose a project before sending the worksheet.')
      return
    }
    if (!email.trim()) {
      setError('This person needs an email address.')
      return
    }
    setSending(true)
    try {
      const response = await fetch('/api/fub/worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          signature,
          brand,
          projectName: selected.project_name,
          projectId: selected.id,
          email: email.trim(),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not send the worksheet.')
      setNotice(payload.message || 'Worksheet sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the worksheet.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={box}>
      <div style={headerBar}>Worksheet</div>
      <div style={inner}>
        <div style={hint}>Email a worksheet for a project. This does not book a meeting.</div>

        <label style={label}>Brand</label>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} style={input}>
          {FUB_BOOKING_BRANDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label style={label}>Project</label>
        {selected && !changingProject ? (
          <div style={{ ...input, background: '#f0fdfa', borderColor: '#0f766e' }}>
            <div style={{ fontWeight: 600 }}>{selected.project_name}</div>
            <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>
              {selected.id}
              {selected.city ? ` · ${selected.city}` : ''}
              {selected.builder ? ` · ${selected.builder}` : ''}
            </div>
            <button type="button" onClick={() => setChangingProject(true)} style={linkButton}>
              Change project
            </button>
          </div>
        ) : (
          <>
            {taggedProjects.length > 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {taggedProjects.map((project) => (
                  <button key={project.id} type="button" onClick={() => chooseProject(project)} style={input}>
                    <div style={{ fontWeight: 600, textAlign: 'left' }}>{project.project_name}</div>
                  </button>
                ))}
              </div>
            ) : null}
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (e.target.value.trim()) setSelected(null)
              }}
              placeholder="Search by project name, ID, or builder"
              style={input}
            />
            {suggestions.length > 0 ? (
              <div style={{ border: '1px solid #99f6e4', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
                {suggestions.map((project) => (
                  <button key={project.id} type="button" onClick={() => chooseProject(project)} style={suggestionBtn}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{project.project_name}</div>
                    <div style={{ fontSize: 11, color: '#667085' }}>
                      {project.id}
                      {project.city ? ` · ${project.city}` : ''}
                      {project.builder ? ` · ${project.builder}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}

        {notice ? <div style={noticeText}>{notice}</div> : null}
        {error ? <div style={errorText}>{error}</div> : null}

        <button type="button" onClick={() => void sendWorksheet()} disabled={sending || !selected} style={button}>
          {sending ? 'Sending worksheet…' : 'Send worksheet'}
        </button>
      </div>
    </div>
  )
}

const box: CSSProperties = {
  border: '2px solid #0f766e',
  borderRadius: 10,
  padding: 0,
  margin: '14px 0',
  background: '#f0fdfa',
  overflow: 'hidden',
}

const headerBar: CSSProperties = {
  background: '#0f766e',
  color: '#fff',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0.2,
  padding: '10px 12px',
}

const inner: CSSProperties = {
  padding: '10px 12px 14px',
}

const hint: CSSProperties = {
  fontSize: 12,
  color: '#115e59',
  margin: '0 0 4px',
  lineHeight: 1.4,
  fontWeight: 600,
}

const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#115e59',
  margin: '8px 0 4px',
}

const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #5eead4',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: '#fff',
}

const button: CSSProperties = {
  width: '100%',
  marginTop: 12,
  border: 'none',
  borderRadius: 8,
  padding: '10px 12px',
  background: '#0f766e',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const linkButton: CSSProperties = {
  marginTop: 6,
  border: 'none',
  background: 'none',
  color: '#0f766e',
  fontSize: 12,
  fontWeight: 600,
  padding: 0,
  cursor: 'pointer',
}

const suggestionBtn: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  borderBottom: '1px solid #eef0f3',
  background: '#fff',
  padding: '8px 10px',
  cursor: 'pointer',
}

const noticeText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#067647',
  fontWeight: 600,
}

const errorText: CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: '#b42318',
  fontWeight: 600,
}
