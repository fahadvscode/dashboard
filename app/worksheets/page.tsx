'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import {
  emptyPurchaser,
  type IdFields,
  type Purchaser,
  type WorksheetFile,
  type WorksheetPerson,
  type WorksheetRecord,
  type WorksheetSummary,
} from '@/lib/worksheetTypes'

type ProjectHit = {
  id: string
  project_name: string
  city: string
  builder: string
}

const ID_KEYS: (keyof IdFields)[] = ['firstName', 'lastName', 'address1', 'address2', 'city', 'state', 'postal', 'country']

function blankModels() {
  return [
    { name: '', type: '' },
    { name: '', type: '' },
    { name: '', type: '' },
  ]
}

function worksheetFromPerson(person: WorksheetPerson, project: ProjectHit): WorksheetRecord {
  const purchaser = emptyPurchaser()
  purchaser.firstName = person.firstName
  purchaser.lastName = person.lastName
  purchaser.address1 = person.address1
  purchaser.address2 = person.address2
  purchaser.city = person.city
  purchaser.state = person.state
  purchaser.postal = person.postal
  purchaser.country = person.country || 'Canada'
  purchaser.phone = person.phone
  purchaser.email = person.email
  return {
    id: '',
    createdAt: '',
    updatedAt: '',
    fubPersonId: person.id,
    clientId: person.clientId,
    personName: person.name,
    projectId: project.id,
    projectName: project.project_name,
    projectCity: project.city,
    projectBuilder: project.builder,
    models: blankModels(),
    purchaser1: purchaser,
    purchaser2: emptyPurchaser(),
    occupation: person.occupation,
    employer: person.employer,
    notes: '',
    extraFiles: [],
    fubAttachTried: [],
  }
}

function applyIdFields(purchaser: Purchaser, fields: IdFields): Purchaser {
  const next = { ...purchaser }
  for (const key of ID_KEYS) {
    if (fields[key]) next[key] = fields[key]
  }
  return next
}

function Label({ children, required }: { children: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-800">
      {children}
      {required ? <span className="ml-0.5 text-red-600">*</span> : null}
    </label>
  )
}

function UploadBox({
  label,
  file,
  busy,
  onPick,
  onClear,
}: {
  label: string
  file: WorksheetFile | null
  busy: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-center text-sm text-gray-500 hover:border-blue-400">
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0]
            event.target.value = ''
            if (picked) onPick(picked)
          }}
        />
        {busy ? (
          <span className="inline-flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading ID…
          </span>
        ) : (
          <>
            <span className="text-2xl leading-none text-gray-400">+</span>
            <span className="mt-1">{file ? file.name : label}</span>
          </>
        )}
      </label>
      {file?.viewUrl ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <a href={file.viewUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            View file
          </a>
          <button type="button" onClick={onClear} className="text-gray-500 hover:text-gray-800">
            Remove
          </button>
        </div>
      ) : null}
    </div>
  )
}

function PurchaserFields({
  title,
  required,
  purchaser,
  busy,
  onChange,
  onUpload,
  onClearFile,
}: {
  title: string
  required?: boolean
  purchaser: Purchaser
  busy: boolean
  onChange: (next: Purchaser) => void
  onUpload: (file: File) => void
  onClearFile: () => void
}) {
  const set = (key: keyof Purchaser, value: string) => onChange({ ...purchaser, [key]: value })
  return (
    <div className="space-y-4 border-t border-gray-100 pt-5">
      <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-start">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <UploadBox
          label="Upload ID"
          file={purchaser.idFile}
          busy={busy}
          onPick={onUpload}
          onClear={onClearFile}
        />
      </div>
      <p className="text-xs text-gray-500">A PDF, PNG, or JPG of the ID fills this purchaser’s name and address.</p>
      <div>
        <Label required={required}>Name</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="First" value={purchaser.firstName} onChange={(event) => set('firstName', event.target.value)} />
          <input className="input" placeholder="Last" value={purchaser.lastName} onChange={(event) => set('lastName', event.target.value)} />
        </div>
      </div>
      <div>
        <Label required={required}>Address</Label>
        <div className="space-y-3">
          <input className="input" placeholder="Address Line 1" value={purchaser.address1} onChange={(event) => set('address1', event.target.value)} />
          <input className="input" placeholder="Address Line 2" value={purchaser.address2} onChange={(event) => set('address2', event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="City" value={purchaser.city} onChange={(event) => set('city', event.target.value)} />
            <input className="input" placeholder="State / Province / Region" value={purchaser.state} onChange={(event) => set('state', event.target.value)} />
            <input className="input" placeholder="Postal / Zip Code" value={purchaser.postal} onChange={(event) => set('postal', event.target.value)} />
            <input className="input" placeholder="Country" value={purchaser.country} onChange={(event) => set('country', event.target.value)} />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required={required}>Phone</Label>
          <input className="input" value={purchaser.phone} onChange={(event) => set('phone', event.target.value)} />
        </div>
        <div>
          <Label required={required}>Email</Label>
          <input className="input" type="email" value={purchaser.email} onChange={(event) => set('email', event.target.value)} />
        </div>
      </div>
    </div>
  )
}

export default function WorksheetPage() {
  const [clientId, setClientId] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [people, setPeople] = useState<WorksheetPerson[]>([])
  const [person, setPerson] = useState<WorksheetPerson | null>(null)
  const [projectQuery, setProjectQuery] = useState('')
  const [projects, setProjects] = useState<ProjectHit[]>([])
  const [project, setProject] = useState<ProjectHit | null>(null)
  const [saved, setSaved] = useState<WorksheetSummary[]>([])
  const [worksheet, setWorksheet] = useState<WorksheetRecord | null>(null)
  const [uploading, setUploading] = useState<'purchaser1' | 'purchaser2' | 'extra' | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)

  useEffect(() => {
    const query = projectQuery.trim()
    if (query.length < 1) {
      setProjects([])
      return
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/worksheets/projects?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setProjects(Array.isArray(data.projects) ? data.projects : [])
    }, 250)
    return () => window.clearTimeout(timer)
  }, [projectQuery])

  async function loadSaved(id: string) {
    const response = await fetch(`/api/worksheets?clientId=${encodeURIComponent(id)}`)
    const data = await response.json()
    setSaved(Array.isArray(data.worksheets) ? data.worksheets : [])
  }

  async function lookup(event?: FormEvent) {
    event?.preventDefault()
    setError('')
    setNotice(null)
    setLookingUp(true)
    setPerson(null)
    setPeople([])
    setWorksheet(null)
    try {
      const response = await fetch('/api/worksheets/person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'No contact found.')
        setSaved([])
        return
      }
      const found = (data.people || []) as WorksheetPerson[]
      setPeople(found)
      if (found.length === 1) setPerson(found[0])
      if (found[0]) await loadSaved(found[0].clientId || clientId.trim())
    } catch {
      setError('Could not reach Follow Up Boss.')
    } finally {
      setLookingUp(false)
    }
  }

  function fillWorksheet() {
    if (!person || !project) return
    setError('')
    setNotice(null)
    setWorksheet(worksheetFromPerson(person, project))
  }

  async function openSaved(id: string) {
    setError('')
    setNotice(null)
    const response = await fetch(`/api/worksheets/${id}`)
    const data = await response.json()
    if (!response.ok || !data.worksheet) {
      setError(data.error || 'Could not open that worksheet.')
      return
    }
    const record = data.worksheet as WorksheetRecord
    setWorksheet(record)
    setProject({
      id: record.projectId,
      project_name: record.projectName,
      city: record.projectCity,
      builder: record.projectBuilder,
    })
    setProjectQuery(record.projectName)
  }

  async function upload(slot: 'purchaser1' | 'purchaser2' | 'extra', file: File) {
    if (!worksheet) return
    setError('')
    setNotice(null)
    setUploading(slot)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('kind', slot === 'extra' ? 'document' : 'id')
      const response = await fetch('/api/worksheets/upload', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Upload failed.')
        return
      }
      setWorksheet((current) => {
        if (!current) return current
        if (slot === 'extra') {
          return { ...current, extraFiles: [...current.extraFiles, data.file as WorksheetFile] }
        }
        const nextPurchaser = applyIdFields({ ...current[slot], idFile: data.file as WorksheetFile }, (data.fields || {}) as IdFields)
        return { ...current, [slot]: nextPurchaser }
      })
      if (data.message) setNotice({ tone: 'warn', text: data.message })
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading('')
    }
  }

  function validate(record: WorksheetRecord) {
    if (!record.projectId) return 'Choose a project.'
    if (!record.models[0]?.name.trim()) return 'Model Name #1 is required.'
    const buyer = record.purchaser1
    if (!buyer.firstName.trim() || !buyer.lastName.trim()) return 'First purchaser first and last name are required.'
    if (!buyer.address1.trim()) return 'First purchaser address is required.'
    if (!buyer.phone.trim()) return 'First purchaser phone is required.'
    if (!buyer.email.trim()) return 'First purchaser email is required.'
    return ''
  }

  async function persist(mode: 'submit' | 'update') {
    if (!worksheet) return
    const problem = validate(worksheet)
    if (problem) {
      setError(problem)
      return
    }
    if (mode === 'update' && !worksheet.id) {
      setError('Submit the worksheet first. Update saves one that is already stored.')
      return
    }
    const savingMode = worksheet.id ? 'update' : 'submit'
    setSaving(true)
    setError('')
    setNotice(null)
    try {
      const response = await fetch(savingMode === 'update' ? `/api/worksheets/${worksheet.id}` : '/api/worksheets', {
        method: savingMode === 'update' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(worksheet),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not save the worksheet.')
        return
      }
      setWorksheet(data.worksheet as WorksheetRecord)
      setNotice({
        tone: data.fubWarning ? 'warn' : 'ok',
        text: data.fubWarning || (savingMode === 'update' ? 'Worksheet updated.' : 'Worksheet saved.'),
      })
      await loadSaved(worksheet.clientId)
    } catch {
      setError('Could not save the worksheet.')
    } finally {
      setSaving(false)
    }
  }

  const projectLine = worksheet
    ? [worksheet.projectName, worksheet.projectCity, worksheet.projectBuilder].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="mx-auto w-full max-w-3xl p-4 pb-16 md:p-6">
      <form onSubmit={lookup} className="card mb-4 p-4 md:p-5">
        <h1 className="text-2xl font-bold text-gray-900">Worksheet</h1>
        <p className="mt-1 text-sm text-gray-600">Find a Follow Up Boss contact by Client ID, attach a project, then fill the purchaser worksheet.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="input"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="Client ID"
            aria-label="Client ID"
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={lookingUp || !clientId.trim()}>
            {lookingUp ? 'Finding…' : 'Find'}
          </button>
        </div>
      </form>

      {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? (
        <p className={`mb-4 rounded-lg border px-4 py-3 text-sm ${notice.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {notice.text}
        </p>
      ) : null}

      {people.length > 1 && !person ? (
        <div className="card mb-4 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">More than one contact matched. Choose one.</p>
          <div className="space-y-2">
            {people.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPerson(item)}
                className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-blue-400"
              >
                <span className="font-medium text-slate-900">{item.name || 'Unnamed contact'}</span>
                <span className="mt-0.5 block text-sm text-gray-500">{[item.clientId, item.email, item.phone].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {person ? (
        <div className="card mb-4 space-y-4 p-4 md:p-5">
          <div>
            <p className="text-lg font-semibold text-slate-900">{person.name || 'Unnamed contact'}</p>
            <p className="text-sm text-gray-600">{[person.clientId, person.email, person.phone].filter(Boolean).join(' · ')}</p>
            <p className="text-sm text-gray-600">{[person.address1, person.city, person.state, person.postal].filter(Boolean).join(', ')}</p>
          </div>
          <div className="relative">
            <Label>Project</Label>
            <input
              className="input"
              value={projectQuery}
              onChange={(event) => {
                setProjectQuery(event.target.value)
                setProject(null)
              }}
              placeholder="Project name or ID"
              aria-label="Project"
            />
            {projects.length > 0 && !project ? (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {projects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setProject(item)
                      setProjectQuery(item.project_name)
                      setProjects([])
                    }}
                    className="block w-full px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="font-medium text-slate-900">{item.project_name}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{[item.city, item.builder, item.id].filter(Boolean).join(' · ')}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {project ? <p className="text-sm text-gray-600">Selected: {[project.project_name, project.city, project.builder].filter(Boolean).join(' · ')}</p> : null}
          <button type="button" className="btn btn-primary" disabled={!project} onClick={fillWorksheet}>
            Fill worksheet
          </button>
          {saved.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-800">Saved worksheets</p>
              <div className="space-y-2">
                {saved.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openSaved(item.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-blue-400"
                  >
                    <span>
                      <span className="block font-medium text-slate-900">{item.projectName || 'Worksheet'}</span>
                      <span className="text-sm text-gray-500">{item.personName}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.updatedAt ? format(new Date(item.updatedAt), 'MMM d, yyyy') : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {worksheet ? (
        <form
          className="overflow-hidden rounded-xl border border-[#d5e4bc] bg-white shadow-sm"
          onSubmit={(event) => {
            event.preventDefault()
            void persist(worksheet.id ? 'update' : 'submit')
          }}
        >
          <div className="bg-[#e7f2d3] px-5 py-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#3d5c2e]">WORKSHEET</p>
          </div>
          <div className="space-y-5 px-4 py-5 md:px-6">
            <div>
              <Label>Project</Label>
              <input className="input bg-gray-50" readOnly value={projectLine} />
            </div>
            {worksheet.models.map((model, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label required={index === 0}>{`Model Name # ${index + 1}`}</Label>
                  <input
                    className="input"
                    value={model.name}
                    onChange={(event) => {
                      const models = worksheet.models.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item
                      )
                      setWorksheet({ ...worksheet, models })
                    }}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <input
                    className="input"
                    value={model.type}
                    onChange={(event) => {
                      const models = worksheet.models.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, type: event.target.value } : item
                      )
                      setWorksheet({ ...worksheet, models })
                    }}
                  />
                </div>
              </div>
            ))}

            <PurchaserFields
              title="First Purchaser"
              required
              purchaser={worksheet.purchaser1}
              busy={uploading === 'purchaser1'}
              onChange={(purchaser1) => setWorksheet({ ...worksheet, purchaser1 })}
              onUpload={(file) => void upload('purchaser1', file)}
              onClearFile={() => setWorksheet({ ...worksheet, purchaser1: { ...worksheet.purchaser1, idFile: null } })}
            />
            <PurchaserFields
              title="Second Purchaser"
              purchaser={worksheet.purchaser2}
              busy={uploading === 'purchaser2'}
              onChange={(purchaser2) => setWorksheet({ ...worksheet, purchaser2 })}
              onUpload={(file) => void upload('purchaser2', file)}
              onClearFile={() => setWorksheet({ ...worksheet, purchaser2: { ...worksheet.purchaser2, idFile: null } })}
            />

            <div className="grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
              <div>
                <Label>Occupation</Label>
                <input className="input" value={worksheet.occupation} onChange={(event) => setWorksheet({ ...worksheet, occupation: event.target.value })} />
              </div>
              <div>
                <Label>Employer</Label>
                <input className="input" value={worksheet.employer} onChange={(event) => setWorksheet({ ...worksheet, employer: event.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea className="input min-h-24" value={worksheet.notes} onChange={(event) => setWorksheet({ ...worksheet, notes: event.target.value })} />
            </div>
            <div>
              <Label>Additional document</Label>
              <UploadBox
                label="Upload a file"
                file={null}
                busy={uploading === 'extra'}
                onPick={(file) => void upload('extra', file)}
                onClear={() => undefined}
              />
              {worksheet.extraFiles.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {worksheet.extraFiles.map((file) => (
                    <li key={file.path} className="flex items-center justify-between gap-3">
                      {file.viewUrl ? (
                        <a href={file.viewUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {file.name}
                        </a>
                      ) : (
                        <span>{file.name}</span>
                      )}
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-800"
                        onClick={() =>
                          setWorksheet({
                            ...worksheet,
                            extraFiles: worksheet.extraFiles.filter((item) => item.path !== file.path),
                          })
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void persist('submit')}>
                {saving ? 'Saving…' : 'Submit'}
              </button>
              <button type="button" className="btn btn-outline" disabled={saving || !worksheet.id} onClick={() => void persist('update')}>
                Update
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  )
}
