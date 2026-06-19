import { getSupabaseAdmin } from '@/lib/supabase'

const STORAGE_BUCKET = 'property-images'

const COMMON_TERMS = new Set([
  'condos', 'condo', 'condominium', 'condominiums',
  'residences', 'residence', 'townhomes', 'townhome',
  'townhouses', 'townhouse', 'towns', 'tower', 'towers',
  'at', 'the', 'on', 'in', 'by', '&', 'and',
  'homes', 'development', 'project', 'estate',
])

export interface ProjectUploadInput {
  project_name: string
  builder?: string
  website_url?: string
  address?: string
  city?: string
  price?: string
  sqft?: string
  details?: string
  quick_facts?: string
  picture_urls?: string
}

export interface ImageFileInput {
  data: ArrayBuffer
  filename: string
  contentType: string
}

export interface CanadaPropertyRow {
  id: number | string
  project_name?: string | null
  builder?: string | null
  website_url?: string | null
  address?: string | null
  city?: string | null
  price?: string | null
  sqft?: string | null
  details?: string | null
  quick_facts?: string | null
  pictures?: string | null
  timestamp?: string | null
}

export type ProjectUploadResult =
  | { action: 'inserted'; id: number; project_name: string }
  | { action: 'updated'; id: number | string; project_name: string; updated_fields: string[] }
  | { action: 'unchanged'; id: number | string; project_name: string }

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === ''
}

export function normalizeProjectName(name: string): string {
  if (!name) return ''

  const words = name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((word) => !COMMON_TERMS.has(word))

  const normalized = words
    .join(' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

function namesMatch(searchName: string, existingName: string): { matches: boolean; matchType: string } {
  const normalizedSearch = normalizeProjectName(searchName)
  const normalizedExisting = normalizeProjectName(existingName)

  if (!normalizedSearch || !normalizedExisting) {
    return { matches: false, matchType: '' }
  }

  if (normalizedExisting === normalizedSearch) {
    return { matches: true, matchType: 'exact' }
  }

  if (normalizedSearch.length >= 5 && normalizedExisting.length >= 5) {
    if (
      normalizedSearch.includes(normalizedExisting) ||
      normalizedExisting.includes(normalizedSearch)
    ) {
      return { matches: true, matchType: 'similar' }
    }
  }

  return { matches: false, matchType: '' }
}

function buildersMatch(searchBuilder: string, existingBuilder: string): boolean {
  const normalizedSearch = searchBuilder.toLowerCase().trim()
  const normalizedExisting = existingBuilder.toLowerCase().trim()

  if (normalizedSearch === normalizedExisting) return true

  if (normalizedSearch.length >= 4 && normalizedExisting.length >= 4) {
    return (
      normalizedSearch.includes(normalizedExisting) ||
      normalizedExisting.includes(normalizedSearch)
    )
  }

  return false
}

export function findDuplicateProject(
  projects: CanadaPropertyRow[],
  projectName: string,
  builder?: string
): CanadaPropertyRow | null {
  const trimmedBuilder = builder?.trim() ?? ''

  for (const project of projects) {
    const existingName = project.project_name ?? ''
    const existingBuilder = project.builder ?? ''
    const { matches: nameMatches } = namesMatch(projectName, existingName)

    if (!nameMatches) continue

    if (trimmedBuilder && existingBuilder.trim()) {
      if (buildersMatch(trimmedBuilder, existingBuilder)) {
        return project
      }
      continue
    }

    return project
  }

  return null
}

async function fetchProjectsForDuplicateCheck(builder?: string): Promise<CanadaPropertyRow[]> {
  const supabase = getSupabaseAdmin()
  const select =
    'id,project_name,builder,website_url,address,city,price,sqft,details,quick_facts,pictures'
  const pageSize = 1000
  const allRows: CanadaPropertyRow[] = []
  let offset = 0

  while (true) {
    let query = supabase
      .from('canada_properties')
      .select(select)
      .range(offset, offset + pageSize - 1)

    if (builder?.trim()) {
      query = query.eq('builder', builder.trim())
    }

    const { data, error } = await query

    if (error) throw error
    if (!data || data.length === 0) break

    allRows.push(...(data as CanadaPropertyRow[]))

    if (data.length < pageSize) break
    offset += pageSize
  }

  return allRows
}

export async function getAllExistingIds(): Promise<Set<number>> {
  const supabase = getSupabaseAdmin()
  const allIds = new Set<number>()
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('canada_properties')
      .select('id')
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data) {
      const id = Number(row.id)
      if (!Number.isNaN(id)) allIds.add(id)
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return allIds
}

export function generateUniqueId(existingIds: Set<number>): number {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const newId = Math.floor(Math.random() * 900000) + 100000
    if (!existingIds.has(newId)) {
      existingIds.add(newId)
      return newId
    }
  }

  if (existingIds.size > 0) {
    return Math.max(...existingIds) + 1
  }

  return 100000
}

function cleanProjectName(name: string): string {
  return name
    .replace(/[^\w\s-]/g, '')
    .replace(/[-\s]+/g, '_')
    .slice(0, 50)
    .replace(/^_+|_+$/g, '')
}

function parsePictureUrls(pictureUrls: string): string[] {
  let urls: string[]

  if (pictureUrls.includes(';')) {
    urls = pictureUrls.split(';')
  } else {
    urls = [pictureUrls]
    for (const delimiter of [',', '\n', '\t', '\r']) {
      const splitUrls: string[] = []
      for (const url of urls) {
        splitUrls.push(...url.split(delimiter))
      }
      urls = splitUrls
    }
  }

  const cleaned = urls
    .map((url) => url.trim())
    .filter(
      (url) =>
        (url.startsWith('http://') || url.startsWith('https://')) &&
        !url.includes('data:image')
    )

  return [...new Set(cleaned)]
}

function projectIdForImages(websiteUrl: string | undefined, fallbackId: number | string): string {
  if (websiteUrl) {
    const parts = websiteUrl.split('/')
    const slug = parts.length >= 2 ? parts[parts.length - 2] : ''
    const cleaned = slug.replace(/[^\w]/g, '').slice(0, 20)
    if (cleaned) return cleaned
  }

  return String(fallbackId)
}

async function downloadImage(url: string): Promise<{ data: ArrayBuffer; ext: string } | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) return null

    const data = await response.arrayBuffer()
    const pathname = new URL(url).pathname.toLowerCase()
    const extMatch = pathname.match(/\.(jpe?g|png|gif|webp)$/)
    let ext = extMatch ? `.${extMatch[1]}` : ''
    if (!ext || !['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      ext = '.jpg'
    }

    return { data, ext }
  } catch {
    return null
  }
}

async function uploadImageToStorage(
  imageData: ArrayBuffer,
  filePath: string,
  contentType: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`

  const headResponse = await fetch(publicUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
  if (headResponse.ok) return publicUrl

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, imageData, {
    contentType,
    upsert: false,
  })

  if (!error) return publicUrl

  if (error.message?.includes('already exists') || (error as { statusCode?: string }).statusCode === '409') {
    return publicUrl
  }

  return null
}

function extensionFromFilename(filename: string): string {
  const match = filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)
  return match ? `.${match[1]}` : '.jpg'
}

async function processImageFiles(
  files: ImageFileInput[],
  projectId: string,
  projectName: string,
  startIndex = 0
): Promise<string[]> {
  if (files.length === 0) return []

  const cleanName = cleanProjectName(projectName)
  const folderName = `${projectId}_${cleanName}`
  const uploadedUrls: string[] = []

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    const ext = extensionFromFilename(file.filename)
    const fileName = `${cleanName}_${String(startIndex + index + 1).padStart(3, '0')}${ext}`
    const filePath = `${folderName}/${fileName}`
    const uploadedUrl = await uploadImageToStorage(file.data, filePath, file.contentType)

    if (uploadedUrl) uploadedUrls.push(uploadedUrl)
  }

  return uploadedUrls
}

async function processImages(
  pictureUrls: string,
  projectId: string,
  projectName: string,
  startIndex = 0
): Promise<string[]> {
  const urls = parsePictureUrls(pictureUrls)
  if (urls.length === 0) return []

  const cleanName = cleanProjectName(projectName)
  const folderName = `${projectId}_${cleanName}`
  const uploadedUrls: string[] = []

  const contentTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }

  for (let index = 0; index < urls.length; index++) {
    const downloaded = await downloadImage(urls[index])
    if (!downloaded) continue

    const fileName = `${cleanName}_${String(startIndex + index + 1).padStart(3, '0')}${downloaded.ext}`
    const filePath = `${folderName}/${fileName}`
    const contentType = contentTypeMap[downloaded.ext] ?? 'image/jpeg'
    const uploadedUrl = await uploadImageToStorage(downloaded.data, filePath, contentType)

    if (uploadedUrl) uploadedUrls.push(uploadedUrl)
  }

  return uploadedUrls
}

async function collectPictures(
  input: ProjectUploadInput,
  imageFiles: ImageFileInput[],
  projectId: string,
  projectName: string
): Promise<string> {
  const fileUrls = await processImageFiles(imageFiles, projectId, projectName, 0)
  const urlUrls = input.picture_urls?.trim()
    ? await processImages(input.picture_urls, projectId, projectName, fileUrls.length)
    : []

  return [...fileUrls, ...urlUrls].join(', ')
}

function buildEmptyFieldUpdates(
  existing: CanadaPropertyRow,
  input: ProjectUploadInput,
  processedPictures?: string
): Record<string, string> {
  const updates: Record<string, string> = {}

  if (isEmpty(existing.website_url) && input.website_url?.trim()) {
    updates.website_url = input.website_url.trim()
  }
  if (isEmpty(existing.address) && input.address?.trim()) {
    updates.address = input.address.trim()
  }
  if (isEmpty(existing.city) && input.city?.trim()) {
    updates.city = input.city.trim()
  }
  if (isEmpty(existing.price) && input.price?.trim()) {
    updates.price = input.price.trim()
  }
  if (isEmpty(existing.sqft) && input.sqft?.trim()) {
    updates.sqft = input.sqft.trim()
  }
  if (isEmpty(existing.details) && input.details?.trim()) {
    updates.details = input.details.trim()
  }
  if (isEmpty(existing.quick_facts) && input.quick_facts?.trim()) {
    updates.quick_facts = input.quick_facts.trim()
  }
  if (isEmpty(existing.pictures) && processedPictures) {
    updates.pictures = processedPictures
  }

  return updates
}

export async function uploadProject(
  input: ProjectUploadInput,
  imageFiles: ImageFileInput[] = []
): Promise<ProjectUploadResult> {
  const projectName = input.project_name.trim()
  if (!projectName) {
    throw new Error('Project name is required')
  }

  const builder = input.builder?.trim() ?? ''
  const supabase = getSupabaseAdmin()
  const candidates = await fetchProjectsForDuplicateCheck(builder || undefined)
  const duplicate = findDuplicateProject(candidates, projectName, builder)

  if (duplicate) {
    const imageProjectId = projectIdForImages(input.website_url, duplicate.id)
    let processedPictures = ''

    if (isEmpty(duplicate.pictures) && (input.picture_urls?.trim() || imageFiles.length > 0)) {
      processedPictures = await collectPictures(input, imageFiles, imageProjectId, projectName)
    }

    const fieldUpdates = buildEmptyFieldUpdates(duplicate, input, processedPictures)
    const updatedFields = Object.keys(fieldUpdates)

    if (updatedFields.length === 0) {
      return {
        action: 'unchanged',
        id: duplicate.id,
        project_name: duplicate.project_name ?? projectName,
      }
    }

    const { error } = await supabase
      .from('canada_properties')
      .update({
        ...fieldUpdates,
        timestamp: new Date().toISOString(),
      })
      .eq('id', duplicate.id)

    if (error) throw error

    return {
      action: 'updated',
      id: duplicate.id,
      project_name: duplicate.project_name ?? projectName,
      updated_fields: updatedFields,
    }
  }

  const existingIds = await getAllExistingIds()
  const newId = generateUniqueId(existingIds)
  const imageProjectId = projectIdForImages(input.website_url, newId)

  let processedPictures = ''
  if (input.picture_urls?.trim() || imageFiles.length > 0) {
    processedPictures = await collectPictures(input, imageFiles, imageProjectId, projectName)
  }

  const insertData = {
    id: newId,
    website_url: input.website_url?.trim() ?? '',
    project_name: projectName,
    builder,
    address: input.address?.trim() ?? '',
    city: input.city?.trim() ?? '',
    price: input.price?.trim() ?? '',
    sqft: input.sqft?.trim() ?? '',
    details: input.details?.trim() ?? '',
    quick_facts: input.quick_facts?.trim() ?? '',
    pictures: processedPictures,
    timestamp: new Date().toISOString(),
  }

  const { error } = await supabase.from('canada_properties').insert(insertData)

  if (error) throw error

  return {
    action: 'inserted',
    id: newId,
    project_name: projectName,
  }
}
