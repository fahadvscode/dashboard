'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Car, Footprints, MapPin, Navigation, Star, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { loadGoogleMapsScript } from '@/lib/loadGoogleMapsScript'

/* ───────────────────────── Types ───────────────────────── */

export interface PresentationProperty {
  id: string
  project_name: string
  builder: string
  address: string
  city: string
  price: string
  bedrooms: string
  bathrooms: string
  sqft: string
  pictures?: string
  map_address?: string | null
  map_lat?: number | null
  map_lng?: number | null
}

export interface Amenity {
  place_id: string
  name: string
  address: string
  lat: number
  lng: number
  category: string
  rating?: number
  totalRatings?: number
  driveTime?: string
  driveDist?: string
  walkTime?: string
  walkDist?: string
  straightDist: number
}

interface AmenityCategory {
  key: string
  label: string
  type: string
  keyword?: string
  keywords?: string[]
  color: string
  marker: string
  radius: number
  maxResults?: number
}

type Props = {
  property: PresentationProperty
  apiKey: string | undefined
  commuteDestination?: string
  nearbyProjects?: PresentationProperty[]
  onSelectNearbyProject?: (p: PresentationProperty) => void
  onAmenitiesLoaded?: (data: Record<string, Amenity[]>) => void
  onHighwaysLoaded?: (data: HighwayInfo[]) => void
  commuteInputRef?: React.RefObject<HTMLInputElement | null>
  onCommuteAddressChange?: (address: string) => void
}

/* ───────────────────────── Constants ───────────────────────── */

const CATEGORIES: AmenityCategory[] = [
  { key: 'school', label: 'Schools', type: 'school', color: '#3b82f6', marker: 'S', radius: 5000 },
  { key: 'supermarket', label: 'Grocery & Supermarkets', type: 'supermarket', color: '#22c55e', marker: 'G', radius: 5000 },
  { key: 'restaurant', label: 'Restaurants & Cafes', type: 'restaurant', color: '#f97316', marker: 'R', radius: 5000 },
  { key: 'shopping_mall', label: 'Shopping & Malls', type: 'shopping_mall', color: '#a855f7', marker: 'M', radius: 8000 },
  { key: 'park', label: 'Parks & Recreation', type: 'park', color: '#16a34a', marker: 'P', radius: 5000 },
  { key: 'hospital', label: 'Hospitals & Clinics', type: 'hospital', color: '#ef4444', marker: 'H', radius: 8000 },
  { key: 'pharmacy', label: 'Pharmacies', type: 'pharmacy', color: '#06b6d4', marker: '+', radius: 5000 },
  { key: 'transit_station', label: 'Transit Stations', type: 'transit_station', color: '#6366f1', marker: 'T', radius: 5000 },
  { key: 'gas_station', label: 'Gas Stations', type: 'gas_station', color: '#eab308', marker: 'F', radius: 5000 },
  { key: 'bank', label: 'Banks', type: 'bank', color: '#14b8a6', marker: 'B', radius: 5000 },
  { key: 'gym', label: 'Fitness & Gyms', type: 'gym', color: '#f43f5e', marker: 'W', radius: 5000 },
]

interface HighwayDef {
  name: string
  short: string
  color: string
  path: { lat: number; lng: number }[]
}

const GTA_HIGHWAYS: HighwayDef[] = [
  { name: 'Highway 401', short: '401', color: '#ef4444', path: [
    // Milton → Mississauga
    {lat:43.5180,lng:-79.9550},{lat:43.5280,lng:-79.9350},{lat:43.5400,lng:-79.9100},{lat:43.5500,lng:-79.8900},
    {lat:43.5580,lng:-79.8700},{lat:43.5650,lng:-79.8500},{lat:43.5730,lng:-79.8300},{lat:43.5800,lng:-79.8100},
    // Mississauga (Erin Mills → Hurontario → Dixie)
    {lat:43.5880,lng:-79.7900},{lat:43.5960,lng:-79.7700},{lat:43.6050,lng:-79.7500},{lat:43.6150,lng:-79.7300},
    {lat:43.6250,lng:-79.7100},{lat:43.6350,lng:-79.6900},{lat:43.6450,lng:-79.6700},{lat:43.6520,lng:-79.6500},
    {lat:43.6580,lng:-79.6300},{lat:43.6640,lng:-79.6100},{lat:43.6700,lng:-79.5900},{lat:43.6760,lng:-79.5700},
    // Etobicoke → 427 → 400
    {lat:43.6820,lng:-79.5500},{lat:43.6900,lng:-79.5300},{lat:43.6960,lng:-79.5100},{lat:43.7020,lng:-79.4900},
    {lat:43.7080,lng:-79.4700},{lat:43.7120,lng:-79.4500},{lat:43.7160,lng:-79.4300},
    // North York → Scarborough
    {lat:43.7200,lng:-79.4100},{lat:43.7240,lng:-79.3900},{lat:43.7280,lng:-79.3700},{lat:43.7320,lng:-79.3500},
    {lat:43.7370,lng:-79.3300},{lat:43.7420,lng:-79.3100},{lat:43.7480,lng:-79.2900},{lat:43.7540,lng:-79.2700},
    {lat:43.7600,lng:-79.2500},{lat:43.7670,lng:-79.2300},{lat:43.7740,lng:-79.2100},{lat:43.7810,lng:-79.1900},
    // Pickering → Ajax
    {lat:43.7880,lng:-79.1700},{lat:43.7950,lng:-79.1500},{lat:43.8020,lng:-79.1300},{lat:43.8100,lng:-79.1000},
    {lat:43.8180,lng:-79.0700},{lat:43.8250,lng:-79.0400},
  ]},
  { name: 'Highway 400', short: '400', color: '#3b82f6', path: [
    // Starts at 401 interchange, goes north through Vaughan
    {lat:43.7120,lng:-79.5130},{lat:43.7200,lng:-79.5120},{lat:43.7300,lng:-79.5110},{lat:43.7400,lng:-79.5100},
    {lat:43.7500,lng:-79.5080},{lat:43.7600,lng:-79.5060},{lat:43.7700,lng:-79.5040},{lat:43.7800,lng:-79.5020},
    {lat:43.7900,lng:-79.5000},{lat:43.8000,lng:-79.4980},{lat:43.8100,lng:-79.4960},{lat:43.8200,lng:-79.4940},
    {lat:43.8300,lng:-79.4920},{lat:43.8450,lng:-79.4900},{lat:43.8600,lng:-79.4880},{lat:43.8750,lng:-79.4860},
    {lat:43.8900,lng:-79.4840},{lat:43.9100,lng:-79.4820},{lat:43.9300,lng:-79.4800},{lat:43.9500,lng:-79.4780},
    {lat:43.9700,lng:-79.4760},{lat:44.0000,lng:-79.4740},
  ]},
  { name: 'Highway 407 ETR', short: '407', color: '#8b5cf6', path: [
    // Burlington → Oakville
    {lat:43.3700,lng:-79.8200},{lat:43.3850,lng:-79.8050},{lat:43.4000,lng:-79.7900},{lat:43.4150,lng:-79.7750},
    {lat:43.4300,lng:-79.7600},{lat:43.4450,lng:-79.7450},{lat:43.4600,lng:-79.7300},
    // Mississauga west (Winston Churchill → Erin Mills → Mavis)
    {lat:43.4750,lng:-79.7150},{lat:43.4900,lng:-79.7000},{lat:43.5050,lng:-79.6850},{lat:43.5200,lng:-79.6700},
    {lat:43.5350,lng:-79.6550},{lat:43.5500,lng:-79.6400},{lat:43.5620,lng:-79.6280},{lat:43.5750,lng:-79.6150},
    // Mississauga east (Hurontario → 410 → Dixie)
    {lat:43.5880,lng:-79.6020},{lat:43.6010,lng:-79.5880},{lat:43.6140,lng:-79.5740},{lat:43.6270,lng:-79.5600},
    {lat:43.6400,lng:-79.5460},{lat:43.6530,lng:-79.5320},{lat:43.6650,lng:-79.5180},
    // Brampton → Vaughan → Markham
    {lat:43.6780,lng:-79.5040},{lat:43.6910,lng:-79.4900},{lat:43.7040,lng:-79.4760},{lat:43.7170,lng:-79.4620},
    {lat:43.7300,lng:-79.4480},{lat:43.7430,lng:-79.4340},{lat:43.7560,lng:-79.4200},{lat:43.7680,lng:-79.4060},
    {lat:43.7800,lng:-79.3920},{lat:43.7920,lng:-79.3780},{lat:43.8040,lng:-79.3640},{lat:43.8160,lng:-79.3500},
    // Markham → Pickering
    {lat:43.8250,lng:-79.3350},{lat:43.8340,lng:-79.3200},{lat:43.8430,lng:-79.3050},{lat:43.8520,lng:-79.2900},
    {lat:43.8600,lng:-79.2700},{lat:43.8680,lng:-79.2500},{lat:43.8760,lng:-79.2300},{lat:43.8840,lng:-79.2100},
    {lat:43.8900,lng:-79.1900},{lat:43.8960,lng:-79.1700},{lat:43.9020,lng:-79.1400},
  ]},
  { name: 'Highway 403', short: '403', color: '#f97316', path: [
    // Hamilton → Burlington
    {lat:43.2400,lng:-79.8900},{lat:43.2500,lng:-79.8800},{lat:43.2600,lng:-79.8700},{lat:43.2700,lng:-79.8600},
    {lat:43.2800,lng:-79.8500},{lat:43.2900,lng:-79.8400},{lat:43.3000,lng:-79.8300},{lat:43.3100,lng:-79.8200},
    // Oakville → Mississauga south
    {lat:43.3200,lng:-79.8100},{lat:43.3400,lng:-79.8000},{lat:43.3600,lng:-79.7900},{lat:43.3800,lng:-79.7800},
    {lat:43.4000,lng:-79.7700},{lat:43.4200,lng:-79.7600},{lat:43.4400,lng:-79.7500},{lat:43.4600,lng:-79.7400},
    // Mississauga (Erin Mills → Hurontario area)
    {lat:43.4800,lng:-79.7300},{lat:43.5000,lng:-79.7200},{lat:43.5150,lng:-79.7100},{lat:43.5300,lng:-79.7000},
    {lat:43.5400,lng:-79.6900},{lat:43.5500,lng:-79.6800},{lat:43.5600,lng:-79.6700},{lat:43.5700,lng:-79.6600},
    {lat:43.5800,lng:-79.6500},{lat:43.5900,lng:-79.6400},{lat:43.6000,lng:-79.6300},{lat:43.6100,lng:-79.6200},
    // Joins 401/QEW area
    {lat:43.6200,lng:-79.6100},{lat:43.6300,lng:-79.6000},{lat:43.6400,lng:-79.5900},{lat:43.6500,lng:-79.5800},
    {lat:43.6600,lng:-79.5700},{lat:43.6700,lng:-79.5600},
  ]},
  { name: 'Highway 410', short: '410', color: '#06b6d4', path: [
    // Starts at 403/QEW, goes north through Brampton
    {lat:43.6000,lng:-79.6350},{lat:43.6100,lng:-79.6380},{lat:43.6200,lng:-79.6410},{lat:43.6300,lng:-79.6440},
    {lat:43.6400,lng:-79.6470},{lat:43.6500,lng:-79.6500},{lat:43.6600,lng:-79.6530},{lat:43.6700,lng:-79.6560},
    {lat:43.6800,lng:-79.6590},{lat:43.6900,lng:-79.6620},{lat:43.7000,lng:-79.6650},{lat:43.7100,lng:-79.6680},
    {lat:43.7200,lng:-79.6710},{lat:43.7300,lng:-79.6740},{lat:43.7400,lng:-79.6770},{lat:43.7500,lng:-79.6800},
    {lat:43.7600,lng:-79.6830},{lat:43.7700,lng:-79.6860},{lat:43.7800,lng:-79.6880},{lat:43.7900,lng:-79.6900},
    {lat:43.8000,lng:-79.6920},{lat:43.8100,lng:-79.6940},
  ]},
  { name: 'Highway 427', short: '427', color: '#ec4899', path: [
    // Starts south near QEW/Gardiner, goes north to 407
    {lat:43.5950,lng:-79.5420},{lat:43.6050,lng:-79.5430},{lat:43.6150,lng:-79.5440},{lat:43.6250,lng:-79.5450},
    {lat:43.6350,lng:-79.5460},{lat:43.6450,lng:-79.5470},{lat:43.6550,lng:-79.5480},{lat:43.6650,lng:-79.5490},
    {lat:43.6750,lng:-79.5500},{lat:43.6850,lng:-79.5510},{lat:43.6950,lng:-79.5520},{lat:43.7050,lng:-79.5530},
    {lat:43.7150,lng:-79.5540},{lat:43.7250,lng:-79.5550},{lat:43.7350,lng:-79.5560},{lat:43.7450,lng:-79.5570},
    {lat:43.7550,lng:-79.5580},{lat:43.7650,lng:-79.5590},{lat:43.7750,lng:-79.5600},
  ]},
  { name: 'QEW', short: 'QEW', color: '#14b8a6', path: [
    // Niagara → Hamilton
    {lat:43.2200,lng:-79.8700},{lat:43.2350,lng:-79.8600},{lat:43.2500,lng:-79.8500},{lat:43.2650,lng:-79.8400},
    // Burlington → Oakville
    {lat:43.2800,lng:-79.8300},{lat:43.3000,lng:-79.8150},{lat:43.3200,lng:-79.8000},{lat:43.3400,lng:-79.7850},
    {lat:43.3600,lng:-79.7700},{lat:43.3750,lng:-79.7550},{lat:43.3900,lng:-79.7400},{lat:43.4050,lng:-79.7250},
    // Oakville → Mississauga south
    {lat:43.4200,lng:-79.7100},{lat:43.4350,lng:-79.6950},{lat:43.4500,lng:-79.6800},{lat:43.4650,lng:-79.6650},
    {lat:43.4800,lng:-79.6500},{lat:43.4950,lng:-79.6350},{lat:43.5100,lng:-79.6200},{lat:43.5200,lng:-79.6050},
    // South Mississauga → Etobicoke
    {lat:43.5300,lng:-79.5900},{lat:43.5400,lng:-79.5750},{lat:43.5500,lng:-79.5600},{lat:43.5600,lng:-79.5450},
    {lat:43.5700,lng:-79.5300},{lat:43.5800,lng:-79.5150},{lat:43.5900,lng:-79.5000},{lat:43.6000,lng:-79.4850},
    {lat:43.6100,lng:-79.4700},{lat:43.6200,lng:-79.4550},{lat:43.6300,lng:-79.4400},
  ]},
]

export interface HighwayInfo {
  name: string
  short: string
  color: string
  driveTime?: string
  driveDist?: string
}

const PRESENTATION_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#bbf7d0' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#16a34a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fde68a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#fbbf24' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#78716c' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#ddd6fe' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3b82f6' }] },
]

/* ───────────────────────── Helpers ───────────────────────── */

function createProjectMarkerIcon(): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="62" viewBox="0 0 52 62">
    <defs><filter id="s" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/></filter></defs>
    <path d="M26 2C13.3 2 3 12.3 3 25c0 19.5 23 35 23 35s23-15.5 23-35C49 12.3 38.7 2 26 2z" fill="#1e40af" stroke="white" stroke-width="2.5" filter="url(#s)"/>
    <circle cx="26" cy="23" r="9" fill="white"/>
    <circle cx="26" cy="23" r="5" fill="#1e40af"/>
  </svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(52, 62),
    anchor: new google.maps.Point(26, 62),
  }
}

function createAmenityMarkerIcon(color: string, letter: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="15" y="20" text-anchor="middle" fill="white" font-size="${letter.length > 1 ? '10' : '13'}" font-weight="700" font-family="system-ui,sans-serif">${letter}</text>
  </svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(30, 30),
    anchor: new google.maps.Point(15, 15),
  }
}

function createHighlightedAmenityMarkerIcon(color: string, letter: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
    <circle cx="20" cy="20" r="14" fill="${color}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    <text x="20" y="26" text-anchor="middle" fill="white" font-size="${letter.length > 1 ? '13' : '16'}" font-weight="700" font-family="system-ui,sans-serif">${letter}</text>
  </svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20),
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function closestPointOnPath(
  path: { lat: number; lng: number }[],
  point: { lat: number; lng: number }
): { lat: number; lng: number } {
  let best = path[0]
  let bestDist = Infinity
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const dx = b.lat - a.lat, dy = b.lng - a.lng
    const lenSq = dx * dx + dy * dy
    let t = lenSq > 0 ? ((point.lat - a.lat) * dx + (point.lng - a.lng) * dy) / lenSq : 0
    t = Math.max(0, Math.min(1, t))
    const proj = { lat: a.lat + t * dx, lng: a.lng + t * dy }
    const d = haversineDistance(point.lat, point.lng, proj.lat, proj.lng)
    if (d < bestDist) { bestDist = d; best = proj }
  }
  return best
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function geocodeAddress(
  geocoder: google.maps.Geocoder,
  address: string
): Promise<google.maps.LatLngLiteral | null> {
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location
        resolve({ lat: loc.lat(), lng: loc.lng() })
      } else resolve(null)
    })
  })
}

function nearbySearchPromise(
  service: google.maps.places.PlacesService,
  request: google.maps.places.PlaceSearchRequest
): Promise<google.maps.places.PlaceResult[]> {
  return new Promise((resolve) => {
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results)
      } else resolve([])
    })
  })
}

function distanceMatrixPromise(
  service: google.maps.DistanceMatrixService,
  request: google.maps.DistanceMatrixRequest
): Promise<google.maps.DistanceMatrixResponse | null> {
  return new Promise((resolve) => {
    service.getDistanceMatrix(request, (response, status) => {
      if (status === 'OK' && response) resolve(response)
      else resolve(null)
    })
  })
}

/* ───────────────────────── Component ───────────────────────── */

export default function PresentationMapView({ property, apiKey, commuteDestination, nearbyProjects, onSelectNearbyProject, onAmenitiesLoaded, onHighwaysLoaded, commuteInputRef, onCommuteAddressChange }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const projectMarkerRef = useRef<google.maps.Marker | null>(null)
  const amenityMarkersRef = useRef<Record<string, google.maps.Marker[]>>({})
  const nearbyMarkersRef = useRef<google.maps.Marker[]>([])
  const commuteRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const highwayPolylinesRef = useRef<google.maps.Polyline[]>([])
  const highwayLabelsRef = useRef<google.maps.Marker[]>([])
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [scriptReady, setScriptReady] = useState(false)
  const [projectLocation, setProjectLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [amenities, setAmenities] = useState<Record<string, Amenity[]>>({})
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set())
  const [loadedAll, setLoadedAll] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)))
  const [highlightedAmenity, setHighlightedAmenity] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [commuteResult, setCommuteResult] = useState<{ drive?: string; walk?: string; transit?: string } | null>(null)
  const [commuteLoading, setCommuteLoading] = useState(false)
  const [highways, setHighways] = useState<HighwayInfo[]>([])
  const [showHighways, setShowHighways] = useState(true)

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return
    let cancelled = false
    loadGoogleMapsScript(apiKey)
      .then(() => { if (!cancelled) setScriptReady(true) })
      .catch(() => { if (!cancelled) setError('Failed to load Google Maps') })
    return () => { cancelled = true }
  }, [apiKey])

  // Initialize Places Autocomplete on commute input
  useEffect(() => {
    if (!scriptReady || !commuteInputRef?.current || !window.google?.maps?.places) return

    const autocomplete = new google.maps.places.Autocomplete(commuteInputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'ca' },
      fields: ['formatted_address', 'geometry'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place?.formatted_address && onCommuteAddressChange) {
        onCommuteAddressChange(place.formatted_address)
      }
    })
  }, [scriptReady, commuteInputRef, onCommuteAddressChange])

  // Get project location
  useEffect(() => {
    if (!scriptReady || !window.google?.maps) return

    if (property.map_lat != null && property.map_lng != null) {
      setProjectLocation({ lat: Number(property.map_lat), lng: Number(property.map_lng) })
      return
    }

    const parts = [
      (property.map_address || property.address || '').trim(),
      (property.city || '').trim(),
      'Canada',
    ].filter(Boolean)
    const q = parts.join(', ')
    if (!q || q === 'Canada') {
      setError('No address available for this project')
      return
    }

    const geocoder = new google.maps.Geocoder()
    geocodeAddress(geocoder, q).then((loc) => {
      if (loc) setProjectLocation(loc)
      else setError(`Could not geocode address: ${q}`)
    })
  }, [scriptReady, property])

  // Initialize map
  useEffect(() => {
    if (!scriptReady || !projectLocation || !mapDivRef.current || !window.google?.maps) return

    const map = new google.maps.Map(mapDivRef.current, {
      center: projectLocation,
      zoom: 14,
      styles: PRESENTATION_MAP_STYLE,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    })
    mapRef.current = map

    infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 280 })

    const marker = new google.maps.Marker({
      position: projectLocation,
      map,
      icon: createProjectMarkerIcon(),
      title: property.project_name,
      zIndex: 1000,
    })
    projectMarkerRef.current = marker

    marker.addListener('click', () => {
      infoWindowRef.current?.setContent(`
        <div style="font-family:system-ui,sans-serif;padding:4px">
          <div style="font-weight:800;font-size:15px;color:#1e40af">${property.project_name}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${property.builder}</div>
          <div style="font-size:11px;color:#475569;margin-top:6px">${property.address || ''}, ${property.city}</div>
        </div>
      `)
      infoWindowRef.current?.open({ map, anchor: marker })
    })

    return () => {
      projectMarkerRef.current?.setMap(null)
      Object.values(amenityMarkersRef.current).flat().forEach((m) => m.setMap(null))
      amenityMarkersRef.current = {}
      infoWindowRef.current?.close()
      mapRef.current = null
    }
  }, [scriptReady, projectLocation, property])

  // Fetch all amenities
  const fetchAmenities = useCallback(async () => {
    if (!mapRef.current || !projectLocation || !window.google?.maps?.places) return

    const placesService = new google.maps.places.PlacesService(mapRef.current)
    const distanceService = new google.maps.DistanceMatrixService()
    const origin = new google.maps.LatLng(projectLocation.lat, projectLocation.lng)

    for (const cat of CATEGORIES) {
      setLoadingCategories((prev) => new Set(prev).add(cat.key))

      try {
        let allResults: google.maps.places.PlaceResult[] = []

        if (cat.keywords && cat.keywords.length > 0) {
          for (const kw of cat.keywords) {
            const kwResults = await nearbySearchPromise(placesService, {
              location: origin,
              radius: cat.radius,
              keyword: kw,
            })
            allResults = allResults.concat(kwResults)
            await new Promise((r) => setTimeout(r, 200))
          }
        } else {
          const searchReq: google.maps.places.PlaceSearchRequest = {
            location: origin,
            radius: cat.radius,
          }
          if (cat.type) searchReq.type = cat.type
          if (cat.keyword) searchReq.keyword = cat.keyword
          allResults = await nearbySearchPromise(placesService, searchReq)
        }

        const maxItems = cat.maxResults || 6
        const seenIds = new Set<string>()
        const sorted = allResults
          .filter((r) => {
            if (!r.geometry?.location || !r.place_id) return false
            if (seenIds.has(r.place_id)) return false
            seenIds.add(r.place_id)
            return true
          })
          .map((r) => ({
            place_id: r.place_id || '',
            name: r.name || 'Unknown',
            address: r.vicinity || '',
            lat: r.geometry!.location!.lat(),
            lng: r.geometry!.location!.lng(),
            category: cat.key,
            rating: r.rating,
            totalRatings: r.user_ratings_total,
            straightDist: haversineDistance(
              projectLocation.lat,
              projectLocation.lng,
              r.geometry!.location!.lat(),
              r.geometry!.location!.lng()
            ),
            driveTime: undefined as string | undefined,
            driveDist: undefined as string | undefined,
            walkTime: undefined as string | undefined,
            walkDist: undefined as string | undefined,
          }))
          .sort((a, b) => a.straightDist - b.straightDist)
          .slice(0, maxItems)

        // Fetch driving distances
        if (sorted.length > 0) {
          const destinations = sorted.map((a) => new google.maps.LatLng(a.lat, a.lng))

          const [driveResp, walkResp] = await Promise.all([
            distanceMatrixPromise(distanceService, {
              origins: [origin],
              destinations,
              travelMode: google.maps.TravelMode.DRIVING,
              unitSystem: google.maps.UnitSystem.METRIC,
            }),
            distanceMatrixPromise(distanceService, {
              origins: [origin],
              destinations,
              travelMode: google.maps.TravelMode.WALKING,
              unitSystem: google.maps.UnitSystem.METRIC,
            }),
          ])

          sorted.forEach((amenity, i) => {
            const driveEl = driveResp?.rows?.[0]?.elements?.[i]
            const walkEl = walkResp?.rows?.[0]?.elements?.[i]
            if (driveEl?.status === 'OK') {
              amenity.driveTime = driveEl.duration?.text
              amenity.driveDist = driveEl.distance?.text
            }
            if (walkEl?.status === 'OK') {
              amenity.walkTime = walkEl.duration?.text
              amenity.walkDist = walkEl.distance?.text
            }
          })
        }

        setAmenities((prev) => ({ ...prev, [cat.key]: sorted }))

        // Add markers to map
        const markers = sorted.map((amenity) => {
          const m = new google.maps.Marker({
            position: { lat: amenity.lat, lng: amenity.lng },
            map: mapRef.current,
            icon: createAmenityMarkerIcon(cat.color, cat.marker),
            title: amenity.name,
            zIndex: 100,
          })
          m.addListener('click', () => {
            setHighlightedAmenity(amenity.place_id)
            infoWindowRef.current?.setContent(`
              <div style="font-family:system-ui,sans-serif;padding:4px;min-width:160px">
                <div style="font-weight:700;font-size:13px;color:#0f172a">${amenity.name}</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px">${amenity.address}</div>
                ${amenity.rating ? `<div style="font-size:11px;color:#f59e0b;margin-top:4px;font-weight:600">${'★'.repeat(Math.round(amenity.rating))} ${amenity.rating}</div>` : ''}
                <div style="margin-top:8px;font-size:11px;color:#475569">
                  ${amenity.driveTime ? `<span>🚗 ${amenity.driveTime} (${amenity.driveDist})</span>` : ''}
                  ${amenity.walkTime ? `<br/><span>🚶 ${amenity.walkTime} (${amenity.walkDist})</span>` : ''}
                </div>
              </div>
            `)
            infoWindowRef.current?.open({ map: mapRef.current!, anchor: m })
          })
          return m
        })
        amenityMarkersRef.current[cat.key] = markers

      } catch (err) {
        console.error(`Failed to fetch ${cat.label}:`, err)
      }

      setLoadingCategories((prev) => {
        const next = new Set(prev)
        next.delete(cat.key)
        return next
      })

      await new Promise((r) => setTimeout(r, 300))
    }

    setLoadedAll(true)
  }, [projectLocation])

  useEffect(() => {
    if (scriptReady && projectLocation && mapRef.current) {
      fetchAmenities()
    }
  }, [scriptReady, projectLocation, fetchAmenities])

  // Filter markers by selected categories
  useEffect(() => {
    Object.entries(amenityMarkersRef.current).forEach(([catKey, markers]) => {
      const visible = selectedCategories.has(catKey)
      markers.forEach((m) => m.setVisible(visible))
    })
  }, [selectedCategories])

  // Highlight amenity
  useEffect(() => {
    if (!highlightedAmenity || !mapRef.current) return

    for (const cat of CATEGORIES) {
      const catAmenities = amenities[cat.key] || []
      const markers = amenityMarkersRef.current[cat.key] || []
      catAmenities.forEach((a, i) => {
        const marker = markers[i]
        if (!marker) return
        if (a.place_id === highlightedAmenity) {
          marker.setIcon(createHighlightedAmenityMarkerIcon(cat.color, cat.marker))
          marker.setZIndex(500)
          mapRef.current?.panTo({ lat: a.lat, lng: a.lng })
        } else {
          marker.setIcon(createAmenityMarkerIcon(cat.color, cat.marker))
          marker.setZIndex(100)
        }
      })
    }
  }, [highlightedAmenity, amenities])

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setHighlightedAmenity(null)
    infoWindowRef.current?.close()

    if (sectionRefs.current[key]) {
      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const selectAllCategories = () => {
    setSelectedCategories(new Set(CATEGORIES.map(c => c.key)))
    setHighlightedAmenity(null)
    infoWindowRef.current?.close()
    if (projectLocation && mapRef.current) {
      mapRef.current.panTo(projectLocation)
      mapRef.current.setZoom(14)
    }
  }

  const deselectAllCategories = () => {
    setSelectedCategories(new Set())
    setHighlightedAmenity(null)
    infoWindowRef.current?.close()
  }

  const allSelected = selectedCategories.size === CATEGORIES.length
  const noneSelected = selectedCategories.size === 0

  const handleAmenityClick = (amenity: Amenity) => {
    setHighlightedAmenity(amenity.place_id)

    const cat = CATEGORIES.find((c) => c.key === amenity.category)
    const markers = amenityMarkersRef.current[amenity.category] || []
    const catAmenities = amenities[amenity.category] || []
    const idx = catAmenities.findIndex((a) => a.place_id === amenity.place_id)
    const marker = markers[idx]

    if (marker && mapRef.current) {
      infoWindowRef.current?.setContent(`
        <div style="font-family:system-ui,sans-serif;padding:4px;min-width:160px">
          <div style="font-weight:700;font-size:13px;color:#0f172a">${amenity.name}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${amenity.address}</div>
          ${amenity.rating ? `<div style="font-size:11px;color:#f59e0b;margin-top:4px;font-weight:600">${'★'.repeat(Math.round(amenity.rating))} ${amenity.rating}</div>` : ''}
          <div style="margin-top:8px;font-size:11px;color:#475569">
            ${amenity.driveTime ? `<span>🚗 ${amenity.driveTime} (${amenity.driveDist})</span>` : ''}
            ${amenity.walkTime ? `<br/><span>🚶 ${amenity.walkTime} (${amenity.walkDist})</span>` : ''}
          </div>
        </div>
      `)
      infoWindowRef.current?.open({ map: mapRef.current, anchor: marker })
    }
  }

  const toggleCategoryCollapse = (key: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const totalAmenities = Object.values(amenities).reduce((sum, arr) => sum + arr.length, 0)

  // Notify parent of amenities data for print
  useEffect(() => {
    if (loadedAll && onAmenitiesLoaded) {
      onAmenitiesLoaded(amenities)
    }
  }, [loadedAll, amenities, onAmenitiesLoaded])

  // Draw highway polylines on the map using predefined path coordinates
  useEffect(() => {
    highwayPolylinesRef.current.forEach((p) => p.setMap(null))
    highwayPolylinesRef.current = []
    highwayLabelsRef.current.forEach((m) => m.setMap(null))
    highwayLabelsRef.current = []

    if (!mapRef.current || !projectLocation || !scriptReady || !window.google?.maps) return

    const map = mapRef.current
    const distanceService = new google.maps.DistanceMatrixService()
    const origin = new google.maps.LatLng(projectLocation.lat, projectLocation.lng)

    for (const hw of GTA_HIGHWAYS) {
      const polyline = new google.maps.Polyline({
        path: hw.path,
        map,
        strokeColor: hw.color,
        strokeOpacity: 0.85,
        strokeWeight: 6,
        zIndex: 50,
        geodesic: true,
      })
      highwayPolylinesRef.current.push(polyline)

      const closestPt = closestPointOnPath(hw.path, projectLocation)

      const w = hw.short.length > 3 ? 56 : 44
      const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="26" viewBox="0 0 ${w} 26">
        <rect rx="5" width="100%" height="100%" fill="${hw.color}" stroke="white" stroke-width="2"/>
        <text x="50%" y="18" text-anchor="middle" fill="white" font-size="13" font-weight="800" font-family="system-ui,sans-serif">${hw.short}</text>
      </svg>`
      const labelMarker = new google.maps.Marker({
        position: closestPt,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(labelSvg)}`,
          scaledSize: new google.maps.Size(w, 26),
          anchor: new google.maps.Point(w / 2, 13),
        },
        title: hw.name,
        zIndex: 300,
      })
      highwayLabelsRef.current.push(labelMarker)
    }

    async function fetchDriveTimes() {
      if (!projectLocation) return
      const foundHighways: HighwayInfo[] = []
      for (const hw of GTA_HIGHWAYS) {
        const closestPt = closestPointOnPath(hw.path, projectLocation)
        try {
          const distResp = await distanceMatrixPromise(distanceService, {
            origins: [origin],
            destinations: [new google.maps.LatLng(closestPt.lat, closestPt.lng)],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
          })
          const el = distResp?.rows?.[0]?.elements?.[0]
          foundHighways.push({
            name: hw.name, short: hw.short, color: hw.color,
            driveTime: el?.status === 'OK' ? el.duration?.text : undefined,
            driveDist: el?.status === 'OK' ? el.distance?.text : undefined,
          })
        } catch {
          foundHighways.push({ name: hw.name, short: hw.short, color: hw.color })
        }
        await new Promise((r) => setTimeout(r, 200))
      }
      foundHighways.sort((a, b) => {
        const da = parseFloat(a.driveDist?.replace(/[^\d.]/g, '') || '9999')
        const db = parseFloat(b.driveDist?.replace(/[^\d.]/g, '') || '9999')
        return da - db
      })
      setHighways(foundHighways)
      if (onHighwaysLoaded) onHighwaysLoaded(foundHighways)
    }

    fetchDriveTimes()

    return () => {
      highwayPolylinesRef.current.forEach((p) => p.setMap(null))
      highwayPolylinesRef.current = []
      highwayLabelsRef.current.forEach((m) => m.setMap(null))
      highwayLabelsRef.current = []
    }
  }, [scriptReady, projectLocation, onHighwaysLoaded])

  // Toggle highway polyline visibility
  useEffect(() => {
    highwayPolylinesRef.current.forEach(p => p.setVisible(showHighways))
    highwayLabelsRef.current.forEach(m => m.setVisible(showHighways))
  }, [showHighways])

  // Commute route
  useEffect(() => {
    if (!mapRef.current || !projectLocation || !commuteDestination || !window.google?.maps) {
      commuteRendererRef.current?.setMap(null)
      commuteRendererRef.current = null
      setCommuteResult(null)
      return
    }

    setCommuteLoading(true)
    const directionsService = new google.maps.DirectionsService()
    const distanceService = new google.maps.DistanceMatrixService()
    const origin = new google.maps.LatLng(projectLocation.lat, projectLocation.lng)

    commuteRendererRef.current?.setMap(null)
    const renderer = new google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#4f46e5', strokeWeight: 4, strokeOpacity: 0.8 },
    })
    commuteRendererRef.current = renderer

    directionsService.route(
      { origin, destination: commuteDestination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === 'OK' && result) {
          renderer.setDirections(result)
        }
      }
    )

    distanceMatrixPromise(distanceService, {
      origins: [origin],
      destinations: [commuteDestination],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
    }).then(async (driveResp) => {
      const driveEl = driveResp?.rows?.[0]?.elements?.[0]
      const drive = driveEl?.status === 'OK' ? `${driveEl.duration?.text} (${driveEl.distance?.text})` : undefined

      const walkResp = await distanceMatrixPromise(distanceService, {
        origins: [origin],
        destinations: [commuteDestination],
        travelMode: google.maps.TravelMode.WALKING,
        unitSystem: google.maps.UnitSystem.METRIC,
      })
      const walkEl = walkResp?.rows?.[0]?.elements?.[0]
      const walk = walkEl?.status === 'OK' ? `${walkEl.duration?.text} (${walkEl.distance?.text})` : undefined

      const transitResp = await distanceMatrixPromise(distanceService, {
        origins: [origin],
        destinations: [commuteDestination],
        travelMode: google.maps.TravelMode.TRANSIT,
        unitSystem: google.maps.UnitSystem.METRIC,
      })
      const transitEl = transitResp?.rows?.[0]?.elements?.[0]
      const transit = transitEl?.status === 'OK' ? `${transitEl.duration?.text} (${transitEl.distance?.text})` : undefined

      setCommuteResult({ drive, walk, transit })
      setCommuteLoading(false)
    })

    return () => {
      renderer.setMap(null)
    }
  }, [commuteDestination, projectLocation])

  // Nearby project markers
  useEffect(() => {
    nearbyMarkersRef.current.forEach((m) => m.setMap(null))
    nearbyMarkersRef.current = []

    if (!mapRef.current || !nearbyProjects?.length || !window.google?.maps || !scriptReady) return

    const geocoder = new google.maps.Geocoder()
    const map = mapRef.current

    nearbyProjects.forEach(async (np) => {
      let pos: google.maps.LatLngLiteral | null = null
      if (np.map_lat != null && np.map_lng != null) {
        pos = { lat: Number(np.map_lat), lng: Number(np.map_lng) }
      } else {
        const parts = [(np.map_address || np.address || '').trim(), (np.city || '').trim(), 'Canada'].filter(Boolean)
        const q = parts.join(', ')
        if (q && q !== 'Canada') {
          pos = await geocodeAddress(geocoder, q)
        }
      }
      if (!pos) return

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="#d97706" stroke="white" stroke-width="2.5"/>
        <text x="14" y="19" text-anchor="middle" fill="white" font-size="12" font-weight="700" font-family="system-ui,sans-serif">C</text>
      </svg>`
      const marker = new google.maps.Marker({
        position: pos,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14),
        },
        title: np.project_name,
        zIndex: 50,
      })

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(`
          <div style="font-family:system-ui,sans-serif;padding:4px;min-width:140px">
            <div style="font-weight:700;font-size:13px;color:#92400e">${np.project_name}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px">${np.builder}</div>
            ${np.price && np.price !== 'N/A' ? `<div style="font-size:11px;color:#16a34a;font-weight:600;margin-top:4px">${np.price}</div>` : ''}
            <div style="font-size:10px;color:#3b82f6;margin-top:6px;cursor:pointer;font-weight:600">Click to present this project</div>
          </div>
        `)
        infoWindowRef.current?.open({ map, anchor: marker })
        if (onSelectNearbyProject) {
          const clickListener = google.maps.event.addListener(infoWindowRef.current!, 'domready', () => {
            google.maps.event.removeListener(clickListener)
          })
        }
      })

      if (onSelectNearbyProject) {
        marker.addListener('dblclick', () => onSelectNearbyProject(np))
      }

      nearbyMarkersRef.current.push(marker)
    })

    return () => {
      nearbyMarkersRef.current.forEach((m) => m.setMap(null))
      nearbyMarkersRef.current = []
    }
  }, [nearbyProjects, scriptReady])

  /* ─── Error / Missing Key ─── */

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 text-sm max-w-md">
          <p className="font-semibold">Google Maps API key missing</p>
          <p className="mt-2 text-amber-800">
            Add <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{' '}
            <code className="rounded bg-amber-100 px-1">.env.local</code> and enable the <strong>Maps JavaScript API</strong>,{' '}
            <strong>Places API</strong>, and <strong>Distance Matrix API</strong>.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 text-sm max-w-md">
          <p className="font-semibold">Could not load map</p>
          <p className="mt-2 text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  /* ─── Main Layout ─── */

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      {/* Map */}
      <div className="flex-1 relative min-h-[350px] lg:min-h-0">
        {(!scriptReady || !projectLocation) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapDivRef} className="absolute inset-0" />

        {/* Map Legend */}
        {loadedAll && (
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 max-w-[220px] z-10">
            <p className="text-xs font-semibold text-gray-700 mb-2">Legend</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.filter((cat) => (amenities[cat.key]?.length ?? 0) > 0).map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className={`flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors ${
                    selectedCategories.has(cat.key)
                      ? 'bg-gray-100 font-semibold'
                      : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-gray-700 truncate">{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            {highways.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-700 mt-2 mb-1">Highways</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {highways.map((hw) => (
                    <button
                      key={hw.short}
                      onClick={() => setShowHighways(!showHighways)}
                      className={`flex items-center gap-1.5 text-xs rounded-md px-1.5 py-1 transition-colors ${
                        showHighways ? 'bg-gray-100 font-semibold' : 'opacity-40 hover:opacity-70'
                      }`}
                    >
                      <span
                        className="w-3.5 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: hw.color }}
                      />
                      <span className="text-gray-700 truncate">{hw.short}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Amenities Panel */}
      <div className="w-full lg:w-[420px] xl:w-[460px] border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col min-h-0 max-h-[50vh] lg:max-h-none overflow-hidden">
        {/* Panel Header */}
        <div className="shrink-0 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Nearby Amenities</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {loadedAll
              ? `${totalAmenities} places found near ${property.project_name}`
              : 'Searching nearby places...'}
          </p>
        </div>

        {/* Commute Results */}
        {commuteDestination && (
          <div className="shrink-0 px-5 py-3 border-b border-indigo-100 bg-indigo-50/50">
            <p className="text-xs font-semibold text-indigo-700 mb-2">Commute to: {commuteDestination}</p>
            {commuteLoading ? (
              <div className="flex items-center gap-2 text-xs text-indigo-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating routes...
              </div>
            ) : commuteResult ? (
              <div className="flex flex-wrap gap-2">
                {commuteResult.drive && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                    <Car className="h-3.5 w-3.5" /> {commuteResult.drive}
                  </span>
                )}
                {commuteResult.walk && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                    <Footprints className="h-3.5 w-3.5" /> {commuteResult.walk}
                  </span>
                )}
                {commuteResult.transit && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-medium">
                    🚌 {commuteResult.transit}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Could not calculate commute</p>
            )}
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 overflow-x-auto scrollbar-hide">
          <button
            onClick={allSelected ? deselectAllCategories : selectAllCategories}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              allSelected
                ? 'bg-gray-900 text-white'
                : noneSelected
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {allSelected ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {allSelected ? 'All' : noneSelected ? 'Show All' : `${selectedCategories.size}/${CATEGORIES.length}`}
          </button>
          {CATEGORIES.map((cat) => {
            const count = amenities[cat.key]?.length ?? 0
            const isLoading = loadingCategories.has(cat.key)
            const isSelected = selectedCategories.has(cat.key)
            return (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }`}
                style={isSelected ? { backgroundColor: cat.color } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color, opacity: isSelected ? 1 : 0.4 }}
                />
                {cat.label.split(' ')[0]}
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : count > 0 ? (
                  <span className="opacity-70">{count}</span>
                ) : null}
              </button>
            )
          })}
          <button
            onClick={() => setShowHighways(!showHighways)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              showHighways
                ? 'text-white shadow-sm bg-gray-700'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-500" />
            Highways
            {highways.length > 0 && <span className="opacity-70">{highways.length}</span>}
          </button>
        </div>

        {/* Amenity List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!loadedAll && Object.keys(amenities).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Discovering nearby amenities...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {CATEGORIES.filter(
                (cat) => selectedCategories.has(cat.key)
              ).map((cat) => {
                const catAmenities = amenities[cat.key] || []
                const isLoading = loadingCategories.has(cat.key)
                const isCollapsed = collapsedCategories.has(cat.key)

                if (!isLoading && catAmenities.length === 0 && loadedAll) return null

                return (
                  <div
                    key={cat.key}
                    ref={(el) => { sectionRefs.current[cat.key] = el }}
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategoryCollapse(cat.key)}
                      className="w-full flex items-center gap-3 px-5 py-3 bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                    >
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-sm text-gray-800 flex-1 text-left">
                        {cat.label}
                      </span>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <span className="text-xs text-gray-500 mr-1">{catAmenities.length}</span>
                      )}
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {/* Amenity Items */}
                    {!isCollapsed && (
                      <div>
                        {isLoading && catAmenities.length === 0 && (
                          <div className="px-5 py-4 text-xs text-gray-400 flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Searching...
                          </div>
                        )}
                        {catAmenities.map((amenity) => (
                          <button
                            key={amenity.place_id}
                            onClick={() => handleAmenityClick(amenity)}
                            className={`w-full text-left px-5 py-3 hover:bg-blue-50/60 transition-colors border-l-[3px] ${
                              highlightedAmenity === amenity.place_id
                                ? 'bg-blue-50/80 border-l-blue-500'
                                : 'border-l-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {amenity.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  {amenity.address}
                                </p>
                                {amenity.rating != null && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                    <span className="text-xs text-gray-600 font-medium">
                                      {amenity.rating}
                                    </span>
                                    {amenity.totalRatings != null && (
                                      <span className="text-xs text-gray-400">
                                        ({amenity.totalRatings})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 font-medium shrink-0 mt-0.5">
                                {formatDistance(amenity.straightDist)}
                              </span>
                            </div>

                            {/* Distance badges */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {amenity.driveTime && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                  <Car className="h-3 w-3" />
                                  {amenity.driveTime}
                                  {amenity.driveDist && (
                                    <span className="text-blue-400 font-normal">
                                      · {amenity.driveDist}
                                    </span>
                                  )}
                                </span>
                              )}
                              {amenity.walkTime && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                                  <Footprints className="h-3 w-3" />
                                  {amenity.walkTime}
                                  {amenity.walkDist && (
                                    <span className="text-green-400 font-normal">
                                      · {amenity.walkDist}
                                    </span>
                                  )}
                                </span>
                              )}
                              {!amenity.driveTime && !amenity.walkTime && (
                                <span className="text-xs text-gray-400 italic">
                                  Calculating distances...
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Highway Access Section */}
              {showHighways && highways.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/80">
                    <span className="w-4 h-4 rounded-full flex-shrink-0 bg-gray-600" />
                    <span className="font-semibold text-sm text-gray-800 flex-1 text-left">Highway Access</span>
                    <span className="text-xs text-gray-500 mr-1">{highways.length}</span>
                  </div>
                  {highways.map((hw) => (
                    <div
                      key={hw.short}
                      className="w-full text-left px-5 py-3 border-l-[3px] border-l-transparent hover:bg-blue-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-5 rounded text-[10px] font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: hw.color }}
                        >
                          {hw.short}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">{hw.name}</p>
                        </div>
                        {hw.driveTime && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                            <Car className="h-3 w-3" />
                            {hw.driveTime}
                            {hw.driveDist && (
                              <span className="text-blue-400 font-normal">· {hw.driveDist}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loadedAll && noneSelected && (
                <div className="px-5 py-12 text-center">
                  <EyeOff className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">All categories hidden</p>
                  <p className="text-xs text-gray-400 mt-1">Click &quot;Show All&quot; or select categories above</p>
                </div>
              )}
              {loadedAll && !noneSelected && totalAmenities === 0 && (
                <div className="px-5 py-12 text-center">
                  <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No amenities found nearby</p>
                  <p className="text-xs text-gray-400 mt-1">Try a project with a valid address</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
