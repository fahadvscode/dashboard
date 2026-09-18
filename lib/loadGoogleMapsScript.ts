let loadPromise: Promise<void> | null = null

async function importRequiredLibraries(): Promise<void> {
  const maps = window.google?.maps
  if (!maps?.importLibrary) {
    throw new Error('Google Maps importLibrary is unavailable')
  }

  await Promise.all([
    maps.importLibrary('maps'),
    maps.importLibrary('geocoding'),
    maps.importLibrary('places'),
  ])
}

function isGeocoderReady(): boolean {
  return typeof window.google?.maps?.Geocoder === 'function'
}

/**
 * Loads the Maps JavaScript API once, then imports maps/geocoding/places libraries.
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (isGeocoderReady()) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const finish = async () => {
      try {
        await importRequiredLibraries()
        resolve()
      } catch (error) {
        loadPromise = null
        reject(error instanceof Error ? error : new Error('Google Maps libraries failed'))
      }
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="1"]'
    )
    if (existing) {
      if (window.google?.maps?.importLibrary) {
        void finish()
        return
      }
      existing.addEventListener('load', () => void finish(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed')), {
        once: true,
      })
      return
    }

    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`
    s.async = true
    s.defer = true
    s.dataset.googleMapsLoader = '1'
    s.onload = () => void finish()
    s.onerror = () => {
      loadPromise = null
      reject(new Error('Google Maps script failed'))
    }
    document.head.appendChild(s)
  })

  return loadPromise
}
