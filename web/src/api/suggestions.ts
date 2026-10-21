import type { AdminPoint, PointInput } from './admin.ts'
import { query, request } from './client.ts'
import type { Material, NearbyPoint } from './points.ts'

export type SuggestionType = 'NEW_POINT' | 'POINT_UPDATE'
export type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProposedPoint {
  name: string | null
  latitude: number
  longitude: number
  address: string | null
  acceptedMaterials: Material[]
  openingHours: string | null
  operator: string | null
  notes: string | null
}

export interface SuggestionItem {
  id: string
  type: SuggestionType
  pointId: string | null
  currentPointName: string | null
  proposed: ProposedPoint
  comment: string | null
  status: SuggestionStatus
  reviewedAt: string | null
  reviewReason: string | null
  createdAt: string
  updatedAt: string
}

export interface SuggestionInput {
  type: SuggestionType
  pointId?: string | null
  proposed: PointInput
  comment: string
}

export interface AdminSuggestionDetail {
  suggestion: SuggestionItem
  authorName: string | null
  authorEmail: string | null
  targetPoint: AdminPoint | null
  nearbyDuplicates: NearbyPoint[]
}

export const SUGGESTION_LIMITS = { comment: 500, reason: 500 } as const

export function fetchMySuggestions(signal?: AbortSignal): Promise<SuggestionItem[]> {
  return request<SuggestionItem[]>('/api/suggestions', { signal })
}

export function fetchMySuggestion(id: string, signal?: AbortSignal): Promise<SuggestionItem> {
  return request<SuggestionItem>(`/api/suggestions/${encodeURIComponent(id)}`, { signal })
}

export function createSuggestion(input: SuggestionInput): Promise<SuggestionItem> {
  return request<SuggestionItem>('/api/suggestions', { method: 'POST', body: input })
}

export function updateMySuggestion(id: string, input: SuggestionInput): Promise<SuggestionItem> {
  return request<SuggestionItem>(`/api/suggestions/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
}

export function deleteMySuggestion(id: string): Promise<void> {
  return request<void>(`/api/suggestions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchAdminSuggestions(
  status?: SuggestionStatus,
  signal?: AbortSignal,
): Promise<SuggestionItem[]> {
  return request<SuggestionItem[]>(`/api/admin/suggestions${query({ status })}`, { signal })
}

export function fetchAdminSuggestion(id: string, signal?: AbortSignal): Promise<AdminSuggestionDetail> {
  return request<AdminSuggestionDetail>(`/api/admin/suggestions/${encodeURIComponent(id)}`, { signal })
}

export function approveSuggestion(
  id: string,
  proposed?: PointInput,
  reason?: string,
): Promise<SuggestionItem> {
  return request<SuggestionItem>(`/api/admin/suggestions/${encodeURIComponent(id)}/approve`, {
    method: 'PUT',
    body: { proposed, reason },
  })
}

export function rejectSuggestion(id: string, reason: string): Promise<SuggestionItem> {
  return request<SuggestionItem>(`/api/admin/suggestions/${encodeURIComponent(id)}/reject`, {
    method: 'PUT',
    body: { reason },
  })
}
