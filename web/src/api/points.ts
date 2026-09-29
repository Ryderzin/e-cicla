export type Material = 'BATTERIES' | 'COMPUTERS' | 'MOBILE_PHONES' | 'ELECTRICAL_ITEMS' | 'SMALL_APPLIANCES'

export interface PointSummary {
  id: string
  name: string | null
  latitude: number
  longitude: number
  acceptedMaterials: Material[]
}

export interface PointDetails extends PointSummary {
  address: string | null
  openingHours: string | null
  operator: string | null
  notes: string | null
  sourceType: 'OSM' | 'MANUAL' | null
  updatedAt: string | null
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal })
  if (!response.ok) {
    throw new Error(`GET ${path} failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

/** Rectangular area of the map, in degrees. */
export interface Area {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export function fetchPoints(area?: Area, signal?: AbortSignal): Promise<PointSummary[]> {
  const query = area
    ? `?${new URLSearchParams({
        minLng: String(area.minLng),
        minLat: String(area.minLat),
        maxLng: String(area.maxLng),
        maxLat: String(area.maxLat),
      })}`
    : ''
  return getJson<PointSummary[]>(`/api/points${query}`, signal)
}

export function fetchPoint(id: string, signal?: AbortSignal): Promise<PointDetails> {
  return getJson<PointDetails>(`/api/points/${encodeURIComponent(id)}`, signal)
}
