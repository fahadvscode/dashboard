export type LatLng = { lat: number; lng: number }

/** Server geocoder (OpenStreetMap). Avoids Google JS Geocoder, which fails when Maps JS is not activated. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
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
