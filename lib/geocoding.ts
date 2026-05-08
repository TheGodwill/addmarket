import 'server-only'
import { logger } from './logger'

const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN

interface MapboxFeature {
  id: string
  place_name: string
  center: [number, number] // [lng, lat]
  place_type: string[]
  context?: Array<{ id: string; text: string }>
}

interface MapboxResponse {
  features: MapboxFeature[]
}

export interface GeocodedPlace {
  name: string
  lat: number
  lng: number
  region?: string
}

// Forward geocode: city name → coordinates (server-side only)
export async function geocodeCity(city: string): Promise<GeocodedPlace | null> {
  if (!MAPBOX_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[geocoding] MAPBOX_SECRET_TOKEN is required in production')
    }
    return null
  }

  const encoded = encodeURIComponent(city)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=fr&types=place,locality&language=fr&limit=1&access_token=${MAPBOX_TOKEN}`

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = (await res.json()) as MapboxResponse
    const feature = data.features.at(0)
    if (!feature) return null

    const [lng, lat] = feature.center
    const region = feature.context?.find((c) => c.id.startsWith('region'))?.text

    return {
      name: feature.place_name.split(',')[0]?.trim() ?? city,
      lat,
      lng,
      ...(region ? { region } : {}),
    }
  } catch (err) {
    logger.error({ err, city }, '[geocoding] forward geocode failed')
    return null
  }
}

// City autocomplete suggestions for France (server-side only)
export async function suggestCities(query: string): Promise<GeocodedPlace[]> {
  if (!MAPBOX_TOKEN || query.length < 2) return []

  const encoded = encodeURIComponent(query)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=fr&types=place,locality&language=fr&limit=5&access_token=${MAPBOX_TOKEN}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as MapboxResponse

    return data.features.map((f) => {
      const [lng, lat] = f.center
      const region = f.context?.find((c) => c.id.startsWith('region'))?.text
      return {
        name: f.place_name.split(',')[0]?.trim() ?? f.place_name,
        lat,
        lng,
        ...(region ? { region } : {}),
      }
    })
  } catch (err) {
    logger.error({ err, query }, '[geocoding] suggest cities failed')
    return []
  }
}

// Haversine distance in km between two lat/lng points
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
