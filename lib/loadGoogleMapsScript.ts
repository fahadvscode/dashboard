let loadPromise: Promise<void> | null = null

function isMapsReady(): boolean {
  return (
    typeof window.google?.maps?.Map === 'function' &&
    typeof window.google?.maps?.Geocoder === 'function' &&
    typeof window.google?.maps?.places?.PlacesService === 'function'
  )
}

/**
 * Loads the Maps JavaScript API once (Geocoder, Map, Places for dashboard maps).
 * Uses the classic libraries=places bootstrap so google.maps.Geocoder is available.
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (isMapsReady()) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      if (isMapsReady()) {
        resolve()
        return
      }
      loadPromise = null
      reject(new Error('Google Maps libraries unavailable after script load'))
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="1"]'
    )
    if (existing) {
      if (isMapsReady()) {
        resolve()
        return
      }
      existing.addEventListener('load', onReady, { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed')), {
        once: true,
      })
      return
    }

    const previousAuthFailure = window.gm_authFailure
    window.gm_authFailure = () => {
      previousAuthFailure?.()
      loadPromise = null
      reject(new Error('Google Maps authentication failed'))
    }

    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    s.async = true
    s.defer = true
    s.dataset.googleMapsLoader = '1'
    s.onload = onReady
    s.onerror = () => {
      loadPromise = null
      reject(new Error('Google Maps script failed'))
    }
    document.head.appendChild(s)
  })

  return loadPromise
}
