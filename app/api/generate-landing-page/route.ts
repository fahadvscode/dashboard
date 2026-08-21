import { NextRequest, NextResponse } from 'next/server'
import { generateLandingPage, LANDING_PAGES_ROOT } from '@/lib/landing-page-generator'
import { generateProjectContent, buildFallbackContent, researchProject } from '@/lib/landing-page-generator/content-generator'
import { getSupabaseAdmin } from '@/lib/supabase'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile } from 'fs/promises'
import type { ProjectConfig } from '@/lib/landing-page-generator/types'
import { join } from 'path'

const execAsync = promisify(exec)

async function parseRequestBody(req: NextRequest): Promise<{ body: Record<string, unknown>; imageFiles: Map<string, File> }> {
  const contentType = req.headers.get('content-type') || ''
  const imageFiles = new Map<string, File>()

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const configStr = formData.get('config')
    const body = configStr ? JSON.parse(String(configStr)) : {}

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image_') && value instanceof File) {
        imageFiles.set(key, value)
      }
    }

    return { body, imageFiles }
  }

  const body = await req.json()
  return { body, imageFiles }
}

export async function POST(req: NextRequest) {
  try {
    const { body, imageFiles } = await parseRequestBody(req)
    const { action } = body

    if (action === 'deploy') {
      return handleDeploy(body)
    }

    if (action === 'research') {
      return handleResearch(body)
    }

    return handleGenerate(body, imageFiles)
  } catch (err) {
    console.error('Generate landing page error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleResearch(body: Record<string, unknown>) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 500 })
  }

  const projectName = String(body.projectName || '').trim()
  const city = String(body.city || '').trim()
  const developer = String(body.developer || '').trim()

  if (!projectName) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  const details = await researchProject(projectName, city, developer, apiKey)
  return NextResponse.json({ details })
}

async function handleGenerate(body: Record<string, unknown>, imageFiles?: Map<string, File>) {
  const config = buildConfigFromBody(body)

  // Generate content using AI or fallback
  let content
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (apiKey) {
    content = await generateProjectContent(config, apiKey)
  } else {
    content = buildFallbackContent(config)
  }

  // Apply user overrides for meta title/description
  if (body.metaTitleOverride && typeof body.metaTitleOverride === 'string' && body.metaTitleOverride.trim()) {
    content.metaTitle = body.metaTitleOverride as string
  }
  if (body.metaDescriptionOverride && typeof body.metaDescriptionOverride === 'string' && body.metaDescriptionOverride.trim()) {
    content.metaDescription = body.metaDescriptionOverride as string
  }

  // Generate the project
  const result = await generateLandingPage(config, content)

  // Register in landing_page_lead_sources if generation succeeded
  if (result.success) {
    try {
      const supabase = getSupabaseAdmin()
      await (supabase as any)
        .from('landing_page_lead_sources')
        .upsert(
          {
            table_name: config.tableName,
            display_name: config.projectName,
            page_name: config.projectName,
            site_url: `https://${config.domain.replace(/^https?:\/\//, '')}`,
            name_style: 'first_name',
            enabled: true,
            has_crm: true,
          },
          { onConflict: 'table_name' }
        )
    } catch (err) {
      console.warn('Failed to register landing page source:', err)
      result.errors.push('Warning: Could not auto-register in landing_page_lead_sources. Register manually in Landing Page Sources.')
    }
  }

  // Save uploaded images to the project folder
  if (result.success && imageFiles && imageFiles.size > 0) {
    const imageSlotNames = ['hero', 'gallery-1', 'gallery-2', 'gallery-3', 'gallery-4', 'gallery-5', 'gallery-6', 'feature-bg']
    for (const [key, file] of imageFiles.entries()) {
      const index = parseInt(key.replace('image_', ''), 10)
      const slotName = imageSlotNames[index] || `image-${index}`
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = join(result.projectPath, 'public', 'images', `${slotName}.${ext}`)
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)
      } catch (err) {
        result.errors.push(`Warning: Could not save image ${slotName}: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }
  }

  return NextResponse.json(result)
}

async function handleDeploy(body: Record<string, unknown>) {
  const folderName = String(body.folderName || '').trim()
  if (!folderName) {
    return NextResponse.json({ error: 'folderName is required' }, { status: 400 })
  }

  const projectDir = join(LANDING_PAGES_ROOT, folderName)

  try {
    // Initialize git
    await execAsync('git init', { cwd: projectDir })
    await execAsync('git add -A', { cwd: projectDir })
    await execAsync('git commit -m "Initial commit: landing page generated"', { cwd: projectDir })

    return NextResponse.json({
      success: true,
      message: 'Git repository initialized. To deploy to Vercel, run the following commands in the project folder.',
      commands: [
        `cd "${projectDir}"`,
        'npx vercel --yes',
        `npx vercel --prod`,
      ],
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Deployment step failed' },
      { status: 500 }
    )
  }
}

function buildConfigFromBody(body: Record<string, unknown>): ProjectConfig {
  const projectName = String(body.projectName || '').trim()
  const folderName =
    String(body.folderName || '').trim() ||
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')

  const tableName =
    String(body.tableName || '').trim() ||
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_') + '_leads'

  const features =
    typeof body.features === 'string'
      ? body.features
          .split('\n')
          .map((f: string) => f.trim())
          .filter(Boolean)
      : Array.isArray(body.features)
        ? body.features
        : []

  const secondaryKeywords =
    typeof body.secondaryKeywords === 'string'
      ? body.secondaryKeywords
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean)
      : Array.isArray(body.secondaryKeywords)
        ? body.secondaryKeywords
        : []

  return {
    projectName,
    folderName,
    description: String(body.description || ''),
    location: String(body.location || ''),
    city: String(body.city || ''),
    neighborhood: String(body.neighborhood || ''),
    developer: String(body.developer || ''),
    propertyType: (body.propertyType as ProjectConfig['propertyType']) || 'condo',
    priceRange: String(body.priceRange || ''),
    units: String(body.units || ''),
    features,
    occupancy: String(body.occupancy || ''),
    additionalInfo: String(body.additionalInfo || ''),
    domain: String(body.domain || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    primaryKeyword: String(body.primaryKeyword || ''),
    secondaryKeywords,
    template: (body.template as ProjectConfig['template']) || 'hero-focus',
    imageOption: (body.imageOption as ProjectConfig['imageOption']) || 'manual',
    images: [],
    ga4Id: String(body.ga4Id || ''),
    gtmId: String(body.gtmId || ''),
    metaPixelId: String(body.metaPixelId || ''),
    tableName,
    thankYouAction: (body.thankYouAction as ProjectConfig['thankYouAction']) || 'message',
    thankYouRedirectUrl: String(body.thankYouRedirectUrl || ''),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }
}
