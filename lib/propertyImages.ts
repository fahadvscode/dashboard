const STORAGE_BUCKET = 'property-images'

/** Inline SVG — no external network request, avoids via.placeholder loops. */
export const PROPERTY_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23e5e7eb' width='400' height='200'/%3E%3Ctext fill='%239ca3af' font-family='system-ui,sans-serif' font-size='14' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EProperty image%3C/text%3E%3C/svg%3E"

function supabasePublicStorageUrl(objectPath: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!supabaseUrl) return null
  const cleanPath = objectPath.replace(/^\/+/, '')
  return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`
}

/** Normalize picture URLs from canada_properties (full URL, relative, or bucket path). */
export function normalizePropertyImageUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.includes('data:image')) return null

  if (/^https?:\/\//i.test(url)) return url

  if (url.startsWith('/property-images/')) {
    return supabasePublicStorageUrl(url.slice(1))
  }

  if (url.startsWith('property-images/')) {
    return supabasePublicStorageUrl(url)
  }

  if (url.startsWith('/storage/v1/object/public/property-images/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    return supabaseUrl ? `${supabaseUrl}${url}` : null
  }

  if (url.startsWith('storage/v1/object/public/property-images/')) {
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath.replace(/^\/+/, '')}`
}
