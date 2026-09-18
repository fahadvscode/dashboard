export type LatLng = { lat: number; lng: number }

async function geocodeWithGoogle(address: string): Promise<LatLng | null> {
  if (typeof window === 'undefined' || !window.google?.maps?.Geocoder) return null
  try {
    const geocoder = new google.maps.Geocoder()
    return await new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(null), 4000)
      geocoder.geocode({ address }, (results, status) => {
        window.clearTimeout(timer)
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location
          resolve({ lat: loc.lat(), lng: loc.lng() })
        } else resolve(null)
      })
    })
  } catch {
    return null
  }
}

async function geocodeWithFallback(address: string): Promise<LatLng | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { lat?: number | null; lng?: number | null }
    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      return { lat: data.lat, lng: data.lng }
    }
  } catch {
    return null
  }
  return null
}

/** Google Geocoder first; OpenStreetMap fallback if Google Geocoding is not activated. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const fromGoogle = await geocodeWithGoogle(address)
  if (fromGoogle) return fromGoogle
  return geocodeWithFallback(address)
}
