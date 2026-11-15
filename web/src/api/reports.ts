import { query, request } from './client.ts'
import type { PointStatus } from './admin.ts'
import type { Material, SourceType } from './points.ts'

export type ReportStatusFilter = 'ALL' | PointStatus

export interface PointReportItem {
  id: string
  name: string | null
  address: string | null
  addressApproximate: boolean
  acceptedMaterials: Material[]
  status: PointStatus
  sourceType: SourceType | null
  updatedAt: string | null
}

/** Collection point report (PB30). The totals are computed by the API over the same filtered list. */
export interface PointReport {
  generatedAt: string
  filters: { status: ReportStatusFilter; material: Material | null; q: string | null }
  items: PointReportItem[]
  totals: {
    count: number
    byStatus: Record<PointStatus, number>
    byMaterial: Record<Material, number>
    bySource: Record<SourceType, number>
  }
}

export interface ReportFilters {
  status: ReportStatusFilter
  material: Material | ''
  q: string
}

export function fetchPointReport(filters: ReportFilters, signal?: AbortSignal): Promise<PointReport> {
  return request<PointReport>(
    `/api/admin/reports/points${query({
      status: filters.status,
      material: filters.material || undefined,
      q: filters.q.trim() || undefined,
    })}`,
    { signal },
  )
}

export interface MonthCount {
  /** yyyy-MM */
  month: string
  total: number
  byCategory: Record<Material, number>
}

/** Disposals registered each month, by kind of device (PB31). Only aggregated numbers. */
export interface DisposalsByMonth {
  generatedAt: string
  months: MonthCount[]
  totals: { total: number; byCategory: Record<Material, number> }
}

export function fetchDisposalsByMonth(months: 6 | 12, signal?: AbortSignal): Promise<DisposalsByMonth> {
  return request<DisposalsByMonth>(`/api/admin/reports/disposals-by-month${query({ months })}`, { signal })
}
