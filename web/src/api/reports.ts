import { query, request } from './client.ts'
import type { PointStatus } from './admin.ts'
import type { ItemKind } from './devices.ts'
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

export type ReportPeriod = 'CURRENT_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'LAST_12_MONTHS'

export interface DisposalBucket {
  /** yyyy-MM-dd (granularity DAY) or yyyy-MM (granularity MONTH) */
  key: string
  total: number
  byCategory: Record<Material, number>
  byKind: Record<ItemKind, number>
}

/** Items delivered in each day or month of a period, by kind (PB31). Counts units; only aggregated numbers. */
export interface DisposalsByPeriod {
  generatedAt: string
  period: ReportPeriod
  granularity: 'DAY' | 'MONTH'
  from: string
  to: string
  buckets: DisposalBucket[]
  totals: { total: number; deliveries: number; byCategory: Record<Material, number>; byKind: Record<ItemKind, number> }
}

export function fetchDisposalsByPeriod(period: ReportPeriod, signal?: AbortSignal): Promise<DisposalsByPeriod> {
  return request<DisposalsByPeriod>(`/api/admin/reports/disposals-by-month${query({ period })}`, { signal })
}
