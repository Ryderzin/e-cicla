import { request } from './client.ts'
import type { ItemKind } from './devices.ts'
import type { Material } from './points.ts'

export interface Disposal {
  id: string
  deviceId: string
  kind: ItemKind
  deviceCategory: Material
  deviceDescription: string
  quantity: number
  pointId: string
  pointName: string
  /** False when the point did not say it accepted that kind of device and the user confirmed anyway. */
  pointAccepted: boolean
  /** yyyy-MM-dd */
  disposedOn: string
  createdAt: string
}

export interface DisposalHistory {
  items: Disposal[]
  /** total and the maps count units (20 batteries count 20); deliveries counts records. */
  totals: { total: number; deliveries: number; byCategory: Record<Material, number>; byKind: Record<ItemKind, number> }
}

export interface DisposalInput {
  deviceId: string
  pointId: string
  disposedOn: string
  confirmNotAccepted: boolean
}

export function fetchDisposals(signal?: AbortSignal): Promise<DisposalHistory> {
  return request<DisposalHistory>('/api/disposals', { signal })
}

/** Fails with status 422 when the point does not accept the device and it was not confirmed (PB11). */
export function createDisposal(input: DisposalInput): Promise<Disposal> {
  return request<Disposal>('/api/disposals', { method: 'POST', body: input })
}

export function deleteDisposal(id: string): Promise<void> {
  return request<void>(`/api/disposals/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
