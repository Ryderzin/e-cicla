import { useId, useState } from 'react'

export interface ChartSeries {
  key: string
  label: string
  /** CSS color, readable against the light and the dark background (contrast of at least 3:1). */
  color: string
}

export interface ChartColumn {
  key: string
  /** Short label under the bar, such as "nov/26". */
  label: string
  /** Full label for screen readers and the tooltip, such as "novembro de 2026". */
  longLabel: string
  values: Record<string, number>
}

interface BarChartProps {
  series: ChartSeries[]
  columns: ChartColumn[]
  /** One sentence that sums up the chart, read by screen readers. */
  summary: string
  unit: [string, string]
  /** Write the label under every n-th bar only (many daily bars would overlap). */
  labelEvery?: number
}

const WIDTH = 720
const HEIGHT = 320
const MARGIN = { top: 28, right: 12, bottom: 40, left: 44 }

/** Integer ticks for the vertical axis, about five of them. */
function ticks(max: number): number[] {
  if (max <= 0) {
    return [0, 1]
  }
  const step = Math.max(1, Math.ceil(max / 5))
  const top = Math.ceil(max / step) * step
  const result: number[] = []
  for (let value = 0; value <= top; value += step) {
    result.push(value)
  }
  return result
}

/**
 * Stacked bar chart drawn in SVG, without a library (PB31). Each bar can be reached with the keyboard
 * and shows the numbers in a tooltip on hover or focus. The page must also show the same numbers in a table.
 */
export default function BarChart({ series, columns, summary, unit, labelEvery = 1 }: BarChartProps) {
  const titleId = useId()
  const [active, setActive] = useState<string | null>(null)
  const totals = columns.map((column) => series.reduce((sum, s) => sum + (column.values[s.key] ?? 0), 0))
  const axis = ticks(Math.max(0, ...totals))
  const top = axis[axis.length - 1]
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const slot = plotWidth / Math.max(1, columns.length)
  const barWidth = Math.min(56, slot * 0.6)
  const y = (value: number) => MARGIN.top + plotHeight - (value / top) * plotHeight
  const count = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
        className="h-auto w-full text-slate-700 dark:text-slate-300"
      >
        <title id={titleId}>{summary}</title>
        {axis.map((value) => (
          <g key={value}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={y(value)}
              y2={y(value)}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={y(value) + 4} textAnchor="end" fontSize={12} fill="currentColor">
              {value}
            </text>
          </g>
        ))}
        {columns.map((column, index) => {
          const x = MARGIN.left + slot * index + (slot - barWidth) / 2
          let stackTop = y(0)
          const total = totals[index]
          const isActive = active === column.key
          const details = series
            .filter((s) => (column.values[s.key] ?? 0) > 0)
            .map((s) => `${s.label}: ${column.values[s.key]}`)
            .join('; ')
          return (
            <g
              key={column.key}
              tabIndex={0}
              role="img"
              aria-label={`${column.longLabel}: ${count(total)}${details ? ` (${details})` : ''}`}
              onMouseEnter={() => setActive(column.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(column.key)}
              onBlur={() => setActive(null)}
              className="cursor-default outline-none focus-visible:[&>rect.focus-ring]:stroke-blue-700 dark:focus-visible:[&>rect.focus-ring]:stroke-blue-400"
            >
              <rect
                className="focus-ring"
                x={x - 4}
                y={MARGIN.top - 4}
                width={barWidth + 8}
                height={plotHeight + 8}
                fill={isActive ? 'currentColor' : 'transparent'}
                fillOpacity={isActive ? 0.06 : 0}
                stroke="transparent"
                strokeWidth={3}
                rx={6}
              />
              {series.map((s) => {
                const value = column.values[s.key] ?? 0
                if (value === 0) {
                  return null
                }
                const height = (value / top) * plotHeight
                stackTop -= height
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={stackTop}
                    width={barWidth}
                    height={height}
                    fill={s.color}
                    className="stroke-white dark:stroke-slate-950"
                    strokeWidth={1.5}
                  />
                )
              })}
              {columns.length <= 12 && (
              <text
                x={x + barWidth / 2}
                y={y(total) - 6}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill="currentColor"
              >
                {total}
              </text>
              )}
              {index % labelEvery === 0 && (
                <text x={x + barWidth / 2} y={HEIGHT - MARGIN.bottom + 20} textAnchor="middle" fontSize={12} fill="currentColor">
                  {column.label}
                </text>
              )}
            </g>
          )
        })}
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={y(0)}
          y2={y(0)}
          className="stroke-slate-500"
          strokeWidth={1.5}
        />
      </svg>

      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 right-2 max-w-xs rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900 print:hidden"
        >
          {columns
            .filter((column) => column.key === active)
            .map((column) => (
              <div key={column.key}>
                <p className="font-semibold capitalize">{column.longLabel}</p>
                <ul className="mt-1 space-y-0.5">
                  {series.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: s.color }} />
                      {s.label}: <strong className="tabular-nums">{column.values[s.key] ?? 0}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-800 dark:text-slate-200" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="chart-swatch inline-block size-3.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
