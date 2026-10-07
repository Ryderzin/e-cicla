import { request } from './client.ts'
import type { Material, SourceType } from './points.ts'

export type PointStatus = 'ACTIVE' | 'INACTIVE'

export interface AdminPoint {
  id: string
  name: string | null
  latitude: number
  longitude: number
  address: string | null
  addressApproximate: boolean
  acceptedMaterials: Material[]
  openingHours: string | null
  operator: string | null
  notes: string | null
  sourceType: SourceType | null
  status: PointStatus
  adminEditedAt: string | null
  updatedAt: string | null
}

/** What the administrator fills in the form. Empty texts are saved as "not informed". */
export interface PointInput {
  name: string
  latitude: number
  longitude: number
  address: string
  acceptedMaterials: Material[]
  openingHours: string
  operator: string
  notes: string
}

// Same limits as the API (PointInput).
export const POINT_LIMITS = { name: 120, address: 200, openingHours: 200, operator: 120, notes: 1000 } as const

export function fetchAdminPoints(signal?: AbortSignal): Promise<AdminPoint[]> {
  return request<AdminPoint[]>('/api/admin/points', { signal })
}

export function fetchAdminPoint(id: string, signal?: AbortSignal): Promise<AdminPoint> {
  return request<AdminPoint>(`/api/admin/points/${encodeURIComponent(id)}`, { signal })
}

export function createPoint(input: PointInput): Promise<AdminPoint> {
  return request<AdminPoint>('/api/admin/points', { method: 'POST', body: input })
}

export function updatePoint(id: string, input: PointInput): Promise<AdminPoint> {
  return request<AdminPoint>(`/api/admin/points/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
}

export function changePointStatus(id: string, status: PointStatus): Promise<AdminPoint> {
  return request<AdminPoint>(`/api/admin/points/${encodeURIComponent(id)}/status`, { method: 'PUT', body: { status } })
}
