'use client'

import { useRef, useState } from 'react'
import { Building2, CheckCircle2, AlertCircle, Info, Image as ImageIcon, X } from 'lucide-react'

interface UploadResult {
  action: 'inserted' | 'updated' | 'unchanged'
  id: number | string
  project_name: string
  updated_fields?: string[]
}

const initialForm = {
  project_name: '',
  builder: '',
  website_url: '',
  address: '',
  city: '',
  price: '',
  sqft: '',
  details: '',
  quick_facts: '',
  picture_urls: '',
}

export default function ProjectUploadPage() {
  const [form, setForm] = useState(initialForm)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setResult(null)
  }

  const handleImageSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const selected = Array.from(files).filter((file) => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`${file.name} is too large. Max size is 20MB per image.`)
        return false
      }
      return true
    })

    setImageFiles((prev) => [...prev, ...selected])
    setError(null)
    setResult(null)
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.project_name.trim()) {
      setError('Project name is required')
      return
    }

    setSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()

      for (const [key, value] of Object.entries(form)) {
        formData.append(key, value)
      }

      for (const file of imageFiles) {
        formData.append('images', file)
      }

      const response = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data.result)
      if (data.result.action === 'inserted') {
        setForm(initialForm)
        setImageFiles([])
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-3xl">
      <div className="mb-6 mt-12 lg:mt-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-7 w-7 text-blue-600" />
          Upload Project
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Manually add a project to Canada Properties when the monitor misses it.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex gap-2">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Safe upload — existing data is never overwritten</p>
            <p>
              If a matching project already exists, only empty fields are filled in and the
              existing ID is kept. New projects get an auto-generated 6-digit ID, same as the
              monitor.
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            result.action === 'unchanged'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-green-200 bg-green-50 text-green-900'
          }`}
        >
          <div className="flex gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              {result.action === 'inserted' && (
                <p>
                  Inserted new project <strong>{result.project_name}</strong> with ID{' '}
                  <strong>{result.id}</strong>.
                </p>
              )}
              {result.action === 'updated' && (
                <p>
                  Updated existing project <strong>{result.project_name}</strong> (ID{' '}
                  <strong>{result.id}</strong>). Fields filled:{' '}
                  <strong>{result.updated_fields?.join(', ')}</strong>.
                </p>
              )}
              {result.action === 'unchanged' && (
                <p>
                  Project <strong>{result.project_name}</strong> (ID <strong>{result.id}</strong>)
                  already exists and had no empty fields to update.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
        <Field label="Project name *" required>
          <input
            type="text"
            value={form.project_name}
            onChange={(e) => handleChange('project_name', e.target.value)}
            className={inputClass}
            placeholder="e.g. Bayview Village Condos"
          />
        </Field>

        <Field label="Builder">
          <input
            type="text"
            value={form.builder}
            onChange={(e) => handleChange('builder', e.target.value)}
            className={inputClass}
            placeholder="e.g. Mattamy Homes"
          />
        </Field>

        <Field label="Website URL">
          <input
            type="url"
            value={form.website_url}
            onChange={(e) => handleChange('website_url', e.target.value)}
            className={inputClass}
            placeholder="https://www.myinvestmentbrokers.com/projects/..."
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Address">
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="City">
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Price">
            <input
              type="text"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className={inputClass}
              placeholder="e.g. From $500,000"
            />
          </Field>
          <Field label="Sqft">
            <input
              type="text"
              value={form.sqft}
              onChange={(e) => handleChange('sqft', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Details">
          <textarea
            value={form.details}
            onChange={(e) => handleChange('details', e.target.value)}
            className={`${inputClass} min-h-24`}
            rows={4}
          />
        </Field>

        <Field label="Quick facts">
          <textarea
            value={form.quick_facts}
            onChange={(e) => handleChange('quick_facts', e.target.value)}
            className={`${inputClass} min-h-20`}
            rows={3}
          />
        </Field>

        <Field label="Images" hint="Upload files from your computer, or paste URLs below (or both)">
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleImageSelect(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <ImageIcon className="h-4 w-4" />
              Choose images
            </button>

            {imageFiles.length > 0 && (
              <ul className="space-y-2">
                {imageFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="shrink-0 text-gray-400 hover:text-red-600"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <Field label="Picture URLs" hint="Optional — separate multiple URLs with semicolons or commas">
          <textarea
            value={form.picture_urls}
            onChange={(e) => handleChange('picture_urls', e.target.value)}
            className={`${inputClass} min-h-20 font-mono text-xs`}
            rows={3}
            placeholder="https://example.com/image1.jpg; https://example.com/image2.jpg"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Uploading…' : 'Upload to Canada Properties'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mb-1">{hint}</span>}
      {children}
    </label>
  )
}
