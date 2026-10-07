import { query, request } from './client.ts'

export type Material = 'BATTERIES' | 'COMPUTERS' | 'MOBILE_PHONES' | 'ELECTRICAL_ITEMS' | 'SMALL_APPLIANCES'

export type SourceType = 'OSM' | 'MANUAL'

export interface PointSummary {
  id: string
  name: string | null
  latitude: number
  longitude: number
  acceptedMaterials: Material[]
}

export interface PointDetails extends PointSummary {
  address: string | null
  /** True when the source had no address and it was estimated from the point's location. */
  addressApproximate: boolean
  openingHours: string | null
  operator: string | null
  notes: string | null
  sourceType: SourceType | null
  /** True when the E-Cicla team reviewed or changed the point. */
  editedByTeam: boolean
  updatedAt: string | null
}

export interface NearbyPoint extends PointSummary {
  /** Straight-line distance from the searched location. */
  distanceMeters: number
}

/** A place found from an address typed by the user. */
export interface Place {
  latitude: number
  longitude: number
  label: string | null
}

/** Rectangular area of the map, in degrees. */
export interface Area {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export function fetchPoints(area?: Area, signal?: AbortSignal): Promise<PointSummary[]> {
  return request<PointSummary[]>(`/api/points${query({ ...area })}`, { signal })
}

export function fetchPoint(id: string, signal?: AbortSignal): Promise<PointDetails> {
  return request<PointDetails>(`/api/points/${encodeURIComponent(id)}`, { signal })
}

export function fetchNearbyPoints(
  latitude: number,
  longitude: number,
  area: Area,
  signal?: AbortSignal,
): Promise<NearbyPoint[]> {
  return request<NearbyPoint[]>(`/api/points/near${query({ latitude, longitude, limit: 5, ...area })}`, { signal })
}

/** Only searched when the user confirms (no search-as-you-type), as the address service asks. */
export function searchPlace(text: string, area: Area, signal?: AbortSignal): Promise<Place> {
  return request<Place>(`/api/geocode${query({ q: text, ...area })}`, { signal })
}
