import { request } from './client.ts'
import type { Material } from './points.ts'

export type BatteryType = 'LITHIUM' | 'ALKALINE' | 'RECHARGEABLE' | 'UNKNOWN'
export type DeviceStatus = 'REGISTERED' | 'DISPOSED'
/** A whole device, or loose waste counted in units (batteries, cables, chargers). */
export type ItemKind = 'DEVICE' | 'WASTE'

export interface DeviceDetails {
  batteryType: BatteryType | null
  screenSizeInches: number | null
}

export interface Device {
  id: string
  kind: ItemKind
  category: Material
  description: string
  /** Always 1 for a device. */
  quantity: number
  details: DeviceDetails | null
  status: DeviceStatus
  createdAt: string
  updatedAt: string
}

export interface DeviceInput {
  kind: ItemKind
  category: Material
  description: string
  quantity: number
  details: DeviceDetails | null
}

// Same limits as the API (DeviceInput).
export const DESCRIPTION_MIN = 2
export const DESCRIPTION_MAX = 80
export const QUANTITY_MAX = 500

export function fetchDevices(signal?: AbortSignal): Promise<Device[]> {
  return request<Device[]>('/api/devices', { signal })
}

export function fetchDevice(id: string, signal?: AbortSignal): Promise<Device> {
  return request<Device>(`/api/devices/${encodeURIComponent(id)}`, { signal })
}

export function createDevice(input: DeviceInput): Promise<Device> {
  return request<Device>('/api/devices', { method: 'POST', body: input })
}

export function updateDevice(id: string, input: DeviceInput): Promise<Device> {
  return request<Device>(`/api/devices/${encodeURIComponent(id)}`, { method: 'PUT', body: input })
}

export function deleteDevice(id: string): Promise<void> {
  return request<void>(`/api/devices/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
