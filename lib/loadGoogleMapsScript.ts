let loadPromise: Promise<void> | null = null

/**
 * Loads the Maps JavaScript API once (for Geocoder outside the map component).
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.maps?.Geocoder) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="1"]'
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed')), {
        once: true,
      })
      return
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    s.async = true
    s.defer = true
    s.dataset.googleMapsLoader = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google Maps script failed'))
    document.head.appendChild(s)
  })
  return loadPromise
}
