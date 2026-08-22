'use client'

import { useState, useRef, useMemo } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Loader2,
  Rocket,
  Upload,
  X,
  Image as ImageIcon,
  Sparkles,
  Download,
} from 'lucide-react'
import {
  TEMPLATE_OPTIONS,
  PROPERTY_TYPES,
  type PropertyType,
  type TemplateStyle,
  type ImageOption,
  type ThankYouAction,
  type TemplateInfo,
} from '@/lib/landing-page-generator/types'

interface FormData {
  projectName: string
  folderName: string
  description: string
  location: string
  city: string
  neighborhood: string
  developer: string
  propertyType: PropertyType
  priceRange: string
  units: string
  features: string
  occupancy: string
  additionalInfo: string
  domain: string
  primaryKeyword: string
  secondaryKeywords: string
  metaTitleOverride: string
  metaDescriptionOverride: string
  template: TemplateStyle
  imageOption: ImageOption
  ga4Id: string
  gtmId: string
  metaPixelId: string
  tableName: string
  thankYouAction: ThankYouAction
  thankYouRedirectUrl: string
}

const STEPS = [
  { name: 'Project Details', key: 'project' },
  { name: 'Domain & SEO', key: 'seo' },
  { name: 'Template', key: 'template' },
  { name: 'Images', key: 'images' },
  { name: 'Analytics', key: 'analytics' },
  { name: 'Review & Generate', key: 'review' },
]

const IMAGE_SLOTS = [
  'Hero Image',
  'Gallery 1',
  'Gallery 2',
  'Gallery 3',
  'Gallery 4',
  'Gallery 5',
  'Gallery 6',
  'Feature Background',
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function toTableName(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .trim() + '_leads'
  )
}

export default function GenerateLandingPage() {
  const [step, setStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [images, setImages] = useState<(File | null)[]>(Array(8).fill(null))
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>(Array(8).fill(null))
  const [researching, setResearching] = useState(false)
  const [researched, setResearched] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState('')
  const [result, setResult] = useState<{
    success: boolean
    projectPath: string
    sql: string
    domain: string
    folderName: string
    errors: string[]
    zipBase64?: string
    wroteToDisk?: boolean
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [form, setForm] = useState<FormData>({
    projectName: '',
    folderName: '',
    description: '',
    location: '',
    city: '',
    neighborhood: '',
    developer: '',
    propertyType: 'condo',
    priceRange: '',
    units: '',
    features: '',
    occupancy: '',
    additionalInfo: '',
    domain: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    metaTitleOverride: '',
    metaDescriptionOverride: '',
    template: 'hero-focus',
    imageOption: 'manual',
    ga4Id: '',
    gtmId: '',
    metaPixelId: '',
    tableName: '',
    thankYouAction: 'message',
    thankYouRedirectUrl: '',
  })

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => {
      const next = { ...prev, ...updates }
      if ('projectName' in updates && updates.projectName !== undefined) {
        if (!prev.folderName || prev.folderName === slugify(prev.projectName)) {
          next.folderName = slugify(updates.projectName)
        }
        if (!prev.tableName || prev.tableName === toTableName(prev.projectName)) {
          next.tableName = toTableName(updates.projectName)
        }
      }
      return next
    })
  }

  const metaTitle = useMemo(() => {
    if (form.metaTitleOverride) return form.metaTitleOverride
    const type = PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label || ''
    return form.projectName
      ? `${form.projectName} | ${type} in ${form.city || 'Your City'}`
      : ''
  }, [form.metaTitleOverride, form.projectName, form.propertyType, form.city])

  const metaDescription = useMemo(() => {
    if (form.metaDescriptionOverride) return form.metaDescriptionOverride
    return form.projectName
      ? `Discover ${form.projectName} — ${form.description || `a new ${PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label?.toLowerCase() || 'development'} in ${form.city || 'your city'}`}. Register now for exclusive pricing and floor plans.`
      : ''
  }, [form.metaDescriptionOverride, form.projectName, form.description, form.propertyType, form.city])

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {}
    if (s === 0) {
      if (!form.projectName.trim()) errs.projectName = 'Project name is required'
      if (!form.city.trim()) errs.city = 'City is required'
      if (!form.developer.trim()) errs.developer = 'Developer / builder is required'
    } else if (s === 1) {
      if (!form.domain.trim()) errs.domain = 'Domain name is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goNext() {
    if (!validateStep(step)) return
    setCompletedSteps((prev) => new Set([...prev, step]))
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function goToStep(s: number) {
    if (s < step || completedSteps.has(s) || s === step + 1) {
      if (s > step && !validateStep(step)) return
      if (s > step) setCompletedSteps((prev) => new Set([...prev, step]))
      setStep(s)
    }
  }

  async function handleResearch() {
    if (!form.projectName.trim() || !form.city.trim() || !form.developer.trim()) return
    setResearching(true)

    try {
      const res = await fetch('/api/generate-landing-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'research',
          projectName: form.projectName,
          city: form.city,
          developer: form.developer,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Research failed')

      const d = data.details
      updateForm({
        description: d.description || form.description,
        location: d.location || form.location,
        neighborhood: d.neighborhood || form.neighborhood,
        propertyType: (['condo', 'townhome', 'detached', 'semi-detached', 'mixed'].includes(d.propertyType) ? d.propertyType : form.propertyType) as PropertyType,
        priceRange: d.priceRange || form.priceRange,
        units: d.units || form.units,
        features: Array.isArray(d.features) && d.features.length > 0 ? d.features.join('\n') : form.features,
        occupancy: d.occupancy || form.occupancy,
        primaryKeyword: d.primaryKeyword || form.primaryKeyword,
        secondaryKeywords: Array.isArray(d.secondaryKeywords) ? d.secondaryKeywords.join(', ') : form.secondaryKeywords,
      })
      setResearched(true)
    } catch (err) {
      console.error('Research failed:', err)
    } finally {
      setResearching(false)
    }
  }

  function handleImageSelect(index: number, file: File | null) {
    if (!file) return
    const newImages = [...images]
    newImages[index] = file
    setImages(newImages)

    const reader = new FileReader()
    reader.onload = (e) => {
      const newPreviews = [...imagePreviews]
      newPreviews[index] = e.target?.result as string
      setImagePreviews(newPreviews)
    }
    reader.readAsDataURL(file)
  }

  function removeImage(index: number) {
    const newImages = [...images]
    newImages[index] = null
    setImages(newImages)
    const newPreviews = [...imagePreviews]
    newPreviews[index] = null
    setImagePreviews(newPreviews)
  }

  async function handleGenerate() {
    setGenerating(true)
    setResult(null)

    const progressSteps = [
      'Researching project...',
      'Generating content...',
      'Creating project files...',
      'Generating SQL...',
    ]

    try {
      for (const msg of progressSteps) {
        setGenerationStep(msg)
        await new Promise((r) => setTimeout(r, 800))
      }

      const formData = new FormData()
      formData.append('config', JSON.stringify({
        ...form,
        features: form.features.split('\n').filter(Boolean),
        secondaryKeywords: form.secondaryKeywords.split(',').map((k) => k.trim()).filter(Boolean),
        metaTitle: metaTitle,
        metaDescription: metaDescription,
      }))

      images.forEach((file, i) => {
        if (file) formData.append(`image_${i}`, file)
      })

      const res = await fetch('/api/generate-landing-page', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data)
    } catch (err) {
      setResult({
        success: false,
        projectPath: '',
        sql: '',
        domain: form.domain,
        folderName: form.folderName,
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      })
    } finally {
      setGenerating(false)
      setGenerationStep('')
    }
  }

  function downloadZip() {
    if (!result?.zipBase64 || !result.folderName) return
    const binary = atob(result.zipBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.folderName}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Generate Landing Page</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a complete landing page project step by step
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => goToStep(i)}
                className="group flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={`hidden h-px w-6 md:block ${
                        i <= step || completedSteps.has(i) ? 'bg-gray-900' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      i === step
                        ? 'bg-gray-900 text-white'
                        : completedSteps.has(i)
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {completedSteps.has(i) ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                </div>
                <span
                  className={`hidden text-xs font-medium md:block ${
                    i === step ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          {step === 0 && <StepProjectDetails form={form} updateForm={updateForm} errors={errors} researching={researching} researched={researched} onResearch={handleResearch} />}
          {step === 1 && (
            <StepDomainSeo
              form={form}
              updateForm={updateForm}
              errors={errors}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
            />
          )}
          {step === 2 && <StepTemplate form={form} updateForm={updateForm} />}
          {step === 3 && (
            <StepImages
              form={form}
              updateForm={updateForm}
              images={images}
              imagePreviews={imagePreviews}
              onImageSelect={handleImageSelect}
              onImageRemove={removeImage}
              fileInputRefs={fileInputRefs}
            />
          )}
          {step === 4 && <StepAnalytics form={form} updateForm={updateForm} />}
          {step === 5 && (
            <StepReview
              form={form}
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              images={images}
              generating={generating}
              generationStep={generationStep}
              result={result}
              copied={copied}
              onGenerate={handleGenerate}
              onDownload={downloadZip}
              onCopy={copyToClipboard}
            />
          )}
        </div>

        {/* Navigation */}
        {!generating && !result && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Step 1: Project Details ─── */
function StepProjectDetails({
  form,
  updateForm,
  errors,
  researching,
  researched,
  onResearch,
}: {
  form: FormData
  updateForm: (u: Partial<FormData>) => void
  errors: Record<string, string>
  researching: boolean
  researched: boolean
  onResearch: () => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the project name, city, and builder — AI will research and fill in everything else
        </p>
      </div>

      {/* Required Fields */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.projectName}
            onChange={(e) => updateForm({ projectName: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${errors.projectName ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            placeholder="e.g. The Residences at Yonge & Eg"
          />
          {errors.projectName && (
            <p className="mt-1 text-xs text-red-600">{errors.projectName}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => updateForm({ city: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${errors.city ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            placeholder="e.g. Toronto"
          />
          {errors.city && (
            <p className="mt-1 text-xs text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Developer / Builder <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.developer}
            onChange={(e) => updateForm({ developer: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2.5 text-sm ${errors.developer ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            placeholder="e.g. Tridel, Menkes"
          />
          {errors.developer && (
            <p className="mt-1 text-xs text-red-600">{errors.developer}</p>
          )}
        </div>
      </div>

      {/* AI Research Button */}
      {!researched && (
        <button
          type="button"
          onClick={onResearch}
          disabled={researching || !form.projectName.trim() || !form.city.trim() || !form.developer.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {researching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Researching with AI... this takes ~15 seconds
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Research Project with AI
            </>
          )}
        </button>
      )}

      {/* AI-Filled Results */}
      {researched && (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <span>AI research complete — all fields have been filled in. Review and edit anything below.</span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Folder Name</label>
              <input
                type="text"
                value={form.folderName}
                onChange={(e) => updateForm({ folderName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="auto-generated-slug"
              />
              <p className="mt-1 text-xs text-gray-400">Auto-generated from project name</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Neighborhood</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => updateForm({ neighborhood: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="Filled by AI"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Location / Address</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateForm({ location: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="Filled by AI"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Type</label>
              <select
                value={form.propertyType}
                onChange={(e) => updateForm({ propertyType: e.target.value as PropertyType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Price Range</label>
              <input
                type="text"
                value={form.priceRange}
                onChange={(e) => updateForm({ priceRange: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="Filled by AI"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Units / Floors</label>
              <input
                type="text"
                value={form.units}
                onChange={(e) => updateForm({ units: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="Filled by AI"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Occupancy</label>
              <input
                type="text"
                value={form.occupancy}
                onChange={(e) => updateForm({ occupancy: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="Filled by AI"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="Filled by AI"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Key Features</label>
              <textarea
                value={form.features}
                onChange={(e) => updateForm({ features: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-blue-50 border-blue-200"
                placeholder="One feature per line"
              />
              <p className="mt-1 text-xs text-gray-400">One feature per line — edit as needed</p>
            </div>
          </div>

          {/* Re-research button */}
          <button
            type="button"
            onClick={onResearch}
            disabled={researching}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            {researching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Re-research with AI
          </button>
        </>
      )}

      {/* Advanced fields toggle (only show before research) */}
      {!researched && (
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          {showAdvanced ? '− Hide optional fields' : '+ Fill in manually instead (optional)'}
        </button>
      )}

      {!researched && showAdvanced && (
        <div className="grid gap-5 md:grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="md:col-span-2 text-xs text-gray-500">
            These fields are optional — AI will fill them if left empty
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Folder Name</label>
            <input type="text" value={form.folderName} onChange={(e) => updateForm({ folderName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="auto-generated" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
            <input type="text" value={form.location} onChange={(e) => updateForm({ location: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. 2100 Yonge Street" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Neighborhood</label>
            <input type="text" value={form.neighborhood} onChange={(e) => updateForm({ neighborhood: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Yonge & Eglinton" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Property Type</label>
            <select value={form.propertyType} onChange={(e) => updateForm({ propertyType: e.target.value as PropertyType })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {PROPERTY_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Price Range</label>
            <input type="text" value={form.priceRange} onChange={(e) => updateForm({ priceRange: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Starting from $499,900" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Units / Floors</label>
            <input type="text" value={form.units} onChange={(e) => updateForm({ units: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. 400 units" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Occupancy</label>
            <input type="text" value={form.occupancy} onChange={(e) => updateForm({ occupancy: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. 2027" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={(e) => updateForm({ description: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Brief description" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Key Features</label>
            <textarea value={form.features} onChange={(e) => updateForm({ features: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="One per line" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Step 2: Domain & SEO ─── */
function StepDomainSeo({
  form,
  updateForm,
  errors,
  metaTitle,
  metaDescription,
}: {
  form: FormData
  updateForm: (u: Partial<FormData>) => void
  errors: Record<string, string>
  metaTitle: string
  metaDescription: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Domain & SEO</h2>
        <p className="mt-1 text-sm text-gray-500">Configure domain and search engine settings</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Domain Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => updateForm({ domain: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.domain ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            placeholder="newproject.ca"
          />
          {errors.domain && <p className="mt-1 text-xs text-red-600">{errors.domain}</p>}
          <p className="mt-1 text-xs text-gray-400">No https:// — just the domain name</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Primary Keyword
          </label>
          <input
            type="text"
            value={form.primaryKeyword}
            onChange={(e) => updateForm({ primaryKeyword: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="new condos in toronto"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Secondary Keywords
          </label>
          <input
            type="text"
            value={form.secondaryKeywords}
            onChange={(e) => updateForm({ secondaryKeywords: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="toronto preconstruction, new homes toronto"
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated</p>
        </div>
      </div>

      {/* Auto-Preview Section */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Eye className="h-4 w-4" />
          Search Preview
        </h3>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="space-y-1">
            <p className="text-lg font-medium text-blue-700 hover:underline">
              {metaTitle || 'Page Title — will auto-generate'}
            </p>
            <p className="text-sm text-emerald-700">
              https://{form.domain || 'yourdomain.ca'}
            </p>
            <p className="text-sm text-gray-600">
              {metaDescription || 'Meta description will auto-generate from your project details...'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Meta Title Override
            </label>
            <input
              type="text"
              value={form.metaTitleOverride}
              onChange={(e) => updateForm({ metaTitleOverride: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={metaTitle || 'Leave empty to auto-generate'}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Meta Description Override
            </label>
            <textarea
              value={form.metaDescriptionOverride}
              onChange={(e) => updateForm({ metaDescriptionOverride: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={metaDescription || 'Leave empty to auto-generate'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Step 3: Template Selection ─── */
function StepTemplate({
  form,
  updateForm,
}: {
  form: FormData
  updateForm: (u: Partial<FormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Choose a Template</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a layout style for your landing page
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TEMPLATE_OPTIONS.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={form.template === t.id}
            onSelect={() => updateForm({ template: t.id })}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateInfo
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {selected && (
        <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div className={`flex h-32 items-end bg-gradient-to-br p-4 ${template.previewGradient}`}>
        <LayoutPreview layout={template.layoutPreview} />
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">{template.description}</p>
      </div>
    </button>
  )
}

function LayoutPreview({ layout }: { layout: string }) {
  const layouts: Record<string, React.ReactNode> = {
    'hero-form-features-faq-footer': (
      <div className="flex w-full gap-1.5">
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-6 rounded bg-white/20" />
          <div className="h-3 w-3/4 rounded bg-white/15" />
        </div>
        <div className="h-10 w-12 rounded bg-white/25" />
      </div>
    ),
    'sidebar-form-scroll-content': (
      <div className="flex w-full gap-1.5">
        <div className="flex flex-1 flex-col gap-1">
          <div className="h-3 rounded bg-white/20" />
          <div className="h-3 rounded bg-white/15" />
          <div className="h-3 w-2/3 rounded bg-white/15" />
        </div>
        <div className="flex w-10 flex-col gap-1">
          <div className="h-8 rounded bg-white/25" />
        </div>
      </div>
    ),
    'narrative-multi-cta-sections': (
      <div className="flex w-full flex-col gap-1">
        <div className="h-3 rounded bg-white/20" />
        <div className="h-2 w-4/5 rounded bg-white/15" />
        <div className="mx-auto mt-1 h-3 w-16 rounded bg-white/25" />
      </div>
    ),
    'gallery-form-details-faq': (
      <div className="grid w-full grid-cols-3 gap-1">
        <div className="col-span-2 h-8 rounded bg-white/20" />
        <div className="h-8 rounded bg-white/25" />
        <div className="h-4 rounded bg-white/15" />
        <div className="h-4 rounded bg-white/15" />
        <div className="h-4 rounded bg-white/15" />
      </div>
    ),
    'minimal-centered-elegant': (
      <div className="flex w-full flex-col items-center gap-1.5">
        <div className="h-2 w-16 rounded bg-white/20" />
        <div className="h-2 w-24 rounded bg-white/15" />
        <div className="mt-1 h-5 w-14 rounded bg-white/25" />
      </div>
    ),
    'map-location-form-details': (
      <div className="flex w-full gap-1.5">
        <div className="flex-1 rounded bg-white/20 p-1">
          <div className="h-full w-full rounded bg-white/10" />
        </div>
        <div className="flex w-14 flex-col gap-1">
          <div className="h-4 rounded bg-white/25" />
          <div className="h-3 rounded bg-white/15" />
        </div>
      </div>
    ),
  }
  return <div className="w-full">{layouts[layout] || null}</div>
}

/* ─── Step 4: Images ─── */
function StepImages({
  form,
  updateForm,
  images,
  imagePreviews,
  onImageSelect,
  onImageRemove,
  fileInputRefs,
}: {
  form: FormData
  updateForm: (u: Partial<FormData>) => void
  images: (File | null)[]
  imagePreviews: (string | null)[]
  onImageSelect: (index: number, file: File | null) => void
  onImageRemove: (index: number) => void
  fileInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Images</h2>
        <p className="mt-1 text-sm text-gray-500">Choose how to handle project images</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {(
          [
            { value: 'manual', label: 'Manual Upload', icon: Upload },
            { value: 'ai-generated', label: 'AI Generated', icon: Sparkles },
            { value: 'both', label: 'Both', icon: ImageIcon },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => updateForm({ imageOption: value })}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              form.imageOption === value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {(form.imageOption === 'manual' || form.imageOption === 'both') && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {IMAGE_SLOTS.map((slot, i) => (
            <div key={slot} className="relative">
              <input
                ref={(el) => { fileInputRefs.current[i] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onImageSelect(i, e.target.files?.[0] || null)}
              />
              {imagePreviews[i] ? (
                <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={imagePreviews[i]!}
                    alt={slot}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onImageRemove(i)}
                      className="rounded-full bg-white p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                    <p className="text-xs font-medium text-white">{slot}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[i]?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400 hover:bg-gray-100"
                >
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">{slot}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(form.imageOption === 'ai-generated' || form.imageOption === 'both') && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              AI will generate placeholder images based on your project details. You can replace
              them later in the project settings.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Step 5: Analytics ─── */
function StepAnalytics({
  form,
  updateForm,
}: {
  form: FormData
  updateForm: (u: Partial<FormData>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Analytics (Optional)</h2>
        <p className="mt-1 text-sm text-gray-500">Connect tracking and analytics services</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Google Analytics 4 ID
          </label>
          <input
            type="text"
            value={form.ga4Id}
            onChange={(e) => updateForm({ ga4Id: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="G-XXXXXXXXXX"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Google Tag Manager ID
          </label>
          <input
            type="text"
            value={form.gtmId}
            onChange={(e) => updateForm({ gtmId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="GTM-XXXXXXX"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Meta Pixel ID</label>
          <input
            type="text"
            value={form.metaPixelId}
            onChange={(e) => updateForm({ metaPixelId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="123456789"
          />
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        All analytics are optional. You can add them later by editing the project.
      </div>
    </div>
  )
}

/* ─── Step 6: Review & Generate ─── */
function StepReview({
  form,
  metaTitle,
  metaDescription,
  images,
  generating,
  generationStep,
  result,
  copied,
  onGenerate,
  onDownload,
  onCopy,
}: {
  form: FormData
  metaTitle: string
  metaDescription: string
  images: (File | null)[]
  generating: boolean
  generationStep: string
  result: {
    success: boolean
    projectPath: string
    sql: string
    domain: string
    folderName: string
    errors: string[]
    zipBase64?: string
    wroteToDisk?: boolean
  } | null
  copied: boolean
  onGenerate: () => void
  onDownload: () => void
  onCopy: (text: string) => void
}) {
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        <p className="mt-4 text-sm font-medium text-gray-700">{generationStep}</p>
        <p className="mt-1 text-xs text-gray-400">This may take a minute...</p>
      </div>
    )
  }

  if (result) {
    if (!result.success) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">Generation Failed</p>
            {result.errors.map((e, i) => (
              <p key={i} className="mt-1">{e}</p>
            ))}
          </div>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Rocket className="h-4 w-4" />
            Retry
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">Landing page generated successfully!</p>
          {result.wroteToDisk ? (
            <p className="mt-1">Saved to <code className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs">{result.projectPath}</code></p>
          ) : (
            <p className="mt-1">
              Download the ZIP and unzip it into{' '}
              <code className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs">Documents/Jaydeep Data/Landing Pages/{result.folderName}</code>
            </p>
          )}
        </div>

        {result.zipBase64 && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Download {result.folderName}.zip
          </button>
        )}

        {result.sql && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">SQL Setup</h3>
              <button
                type="button"
                onClick={() => onCopy(result.sql)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-xs text-gray-100">
              {result.sql}
            </pre>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700">Deploy to Vercel</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600">
            <li>Unzip into <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">Documents/Jaydeep Data/Landing Pages/{result.folderName}</code></li>
            <li>Run <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">npx vercel --yes</code> then <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">npx vercel --prod</code></li>
            <li>Add domain <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">{result.domain}</code> in Vercel</li>
          </ol>
          <p className="mt-3 text-sm font-medium text-gray-700">DNS</p>
          <ul className="mt-1 space-y-1 text-sm text-gray-600">
            <li><code className="text-xs">A Record → 76.76.21.21</code></li>
            <li><code className="text-xs">CNAME (www) → cname.vercel-dns.com</code></li>
          </ul>
        </div>
      </div>
    )
  }

  const uploadedCount = images.filter(Boolean).length
  const templateInfo = TEMPLATE_OPTIONS.find((t) => t.id === form.template)
  const propertyLabel = PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review & Generate</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your settings before generating the landing page
        </p>
      </div>

      {/* Project Info */}
      <SummaryCard title="Project Info">
        <SummaryRow label="Project Name" value={form.projectName} />
        <SummaryRow label="Folder" value={form.folderName} />
        <SummaryRow label="Developer" value={form.developer} />
        <SummaryRow label="Location" value={[form.location, form.neighborhood, form.city].filter(Boolean).join(', ')} />
        <SummaryRow label="Property Type" value={propertyLabel} />
        <SummaryRow label="Price Range" value={form.priceRange} />
        <SummaryRow label="Units/Floors" value={form.units} />
        <SummaryRow label="Occupancy" value={form.occupancy} />
        {form.features && (
          <SummaryRow
            label="Features"
            value={form.features.split('\n').filter(Boolean).length + ' listed'}
          />
        )}
      </SummaryCard>

      {/* Domain & SEO */}
      <SummaryCard title="Domain & SEO">
        <SummaryRow label="Domain" value={form.domain} />
        <SummaryRow label="Meta Title" value={metaTitle} />
        <SummaryRow label="Primary Keyword" value={form.primaryKeyword} />
        <SummaryRow label="Secondary Keywords" value={form.secondaryKeywords} />
      </SummaryCard>

      {/* Template */}
      <SummaryCard title="Template">
        <SummaryRow label="Selected" value={templateInfo?.name || form.template} />
      </SummaryCard>

      {/* Images */}
      <SummaryCard title="Images">
        <SummaryRow
          label="Option"
          value={
            form.imageOption === 'manual'
              ? 'Manual Upload'
              : form.imageOption === 'ai-generated'
                ? 'AI Generated'
                : 'Both'
          }
        />
        {(form.imageOption === 'manual' || form.imageOption === 'both') && (
          <SummaryRow label="Uploaded" value={`${uploadedCount} / 8 images`} />
        )}
      </SummaryCard>

      {/* Analytics */}
      <SummaryCard title="Analytics">
        <SummaryRow label="GA4" value={form.ga4Id || '—'} />
        <SummaryRow label="GTM" value={form.gtmId || '—'} />
        <SummaryRow label="Meta Pixel" value={form.metaPixelId || '—'} />
      </SummaryCard>

      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Rocket className="h-4 w-4" />
          Generate Landing Page
        </button>
      </div>
    </div>
  )
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      <dl className="grid gap-2 text-sm">{children}</dl>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}
