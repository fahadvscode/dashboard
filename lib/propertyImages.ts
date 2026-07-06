const STORAGE_BUCKET = 'property-images'
const DEFAULT_IMAGES_CDN_URL = 'https://images.preconfactory.com'

/** Inline SVG — no external network request, avoids via.placeholder loops. */
export const PROPERTY_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23e5e7eb' width='400' height='200'/%3E%3Ctext fill='%239ca3af' font-family='system-ui,sans-serif' font-size='14' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProperty image%3C/text%3E%3C/svg%3E"

function imagesCdnBase(): string {
  return (
    process.env.NEXT_PUBLIC_IMAGES_CDN_URL?.replace(/\/$/, '') ?? DEFAULT_IMAGES_CDN_URL
  )
}

function supabaseBase(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? null
}

/** Rewrite raw Supabase storage public URLs to the images CDN (same path, different host). */
export function toImagesCdnUrl(url: string): string {
  const trimmed = url.trim()
  const supabaseUrl = supabaseBase()
  if (!supabaseUrl) return trimmed

  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`
  if (trimmed.startsWith(storagePrefix)) {
    return `${imagesCdnBase()}/storage/v1/object/public/${trimmed.slice(storagePrefix.length)}`
  }

  return trimmed
}

function supabasePublicStorageUrl(objectPath: string): string | null {
  const cleanPath = objectPath.replace(/^\/+/, '')
  return `${imagesCdnBase()}/storage/v1/object/public/${cleanPath}`
}

/** Public CDN URL for a storage object path (e.g. email-images/logo.png). */
export function getCdnStoragePublicUrl(objectPath: string): string {
  const cleanPath = objectPath.replace(/^\/+/, '')
  return `${imagesCdnBase()}/storage/v1/object/public/${cleanPath}`
}

/** rental-documents bucket — always serve via images CDN, never raw supabase.co */
export function getRentalDocumentPublicUrl(fileName: string): string {
  return getCdnStoragePublicUrl(`rental-documents/${fileName.replace(/^\/+/, '')}`)
}

/** Long-lived cache header for public storage uploads (edge CDN caches separately). */
export const STORAGE_UPLOAD_CACHE_CONTROL = '31536000'

/** Normalize picture URLs from canada_properties (full URL, relative, or bucket path). */
export function normalizePropertyImageUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.includes('data:image')) return null

  if (/^https?:\/\//i.test(url)) {
    return toImagesCdnUrl(url)
  }

  if (url.startsWith('/property-images/')) {
    return supabasePublicStorageUrl(url.slice(1))
  }

  if (url.startsWith('property-images/')) {
    return supabasePublicStorageUrl(url)
  }

  if (url.startsWith('/storage/v1/object/public/')) {
    return `${imagesCdnBase()}${url}`
  }

  if (url.startsWith('storage/v1/object/public/')) {
    return supabasePublicStorageUrl(url)
  }

  return null
}

/** Parse pictures field (comma or semicolon separated) into loadable image URLs. */
export function parsePropertyPictures(pictures: string | null | undefined): string[] {
  if (!pictures?.trim()) return []

  const parts = pictures.includes(';') ? pictures.split(';') : pictures.split(',')
  const seen = new Set<string>()
  const urls: string[] = []

  for (const part of parts) {
    const normalized = normalizePropertyImageUrl(part)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      urls.push(normalized)
    }
  }

  return urls
}

export function getFirstPropertyImage(pictures: string | null | undefined): string {
  return parsePropertyPictures(pictures)[0] ?? PROPERTY_IMAGE_PLACEHOLDER
}

/** Use on img onError — applies placeholder once to prevent infinite retries. */
export function handlePropertyImageError(img: HTMLImageElement) {
  if (img.dataset.fallbackApplied === 'true') return
  img.dataset.fallbackApplied = 'true'
  img.src = PROPERTY_IMAGE_PLACEHOLDER
}

export function getPropertyImagePublicUrl(filePath: string): string {
  return getCdnStoragePublicUrl(`${STORAGE_BUCKET}/${filePath.replace(/^\/+/, '')}`)
}
