import { useId } from 'react'

import { formatPercent } from '../lib/percent.ts'

export interface DonutSegment {
  key: string
  label: string
  value: number
  /** CSS color, readable against the light and the dark background (contrast of at least 3:1). */
  color: string
}

interface DonutChartProps {
  title: string
  segments: DonutSegment[]
  /** Unit in singular and plural, such as ["ponto", "pontos"]. */
  unit: [string, string]
}

const SIZE = 180
const RADIUS = 66
const STROKE = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Donut chart drawn in SVG, without a library (PB30, PB31): each part with its share of the total, in the
 * legend too, so the numbers do not depend on telling the colors apart.
 */
export default function DonutChart({ title, segments, unit }: DonutChartProps) {
  const titleId = useId()
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const shown = segments.filter((s) => s.value > 0)
  const count = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? unit[0] : unit[1]}`
  const summary =
    total === 0
      ? `${title}: nenhum dado.`
      : `${title}: ${shown.map((s) => `${s.label}, ${count(s.value)} (${formatPercent(s.value, total)})`).join('; ')}.`

  // Where each part starts along the ring: the sum of the parts before it.
  const starts = shown.map((_, i) => shown.slice(0, i).reduce((sum, s) => sum + (s.value / total) * CIRCUMFERENCE, 0))
  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row sm:items-center print:break-inside-avoid">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-labelledby={titleId}
        className="size-44 shrink-0 text-slate-900 dark:text-slate-100"
      >
        <title id={titleId}>{summary}</title>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        {shown.map((s, i) => {
          const length = (s.value / total) * CIRCUMFERENCE
          // A thin gap between parts, so neighbours stay apart even with similar colors.
          const gap = shown.length > 1 ? Math.min(2, length / 4) : 0
          const segment = (
            <circle
              key={s.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${Math.max(0, length - gap)} ${CIRCUMFERENCE}`}
              strokeDashoffset={-starts[i]}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )
          return segment
        })}
        <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" fontSize={26} fontWeight={700} fill="currentColor">
          {total.toLocaleString('pt-BR')}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 20} textAnchor="middle" fontSize={13} fill="currentColor">
          {total === 1 ? unit[0] : unit[1]}
        </text>
      </svg>
      <figcaption className="w-full min-w-0">
        <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        {total === 0 ? (
          <p className="mt-1 text-slate-700 dark:text-slate-300">Ainda não há dados.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {segments.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <span aria-hidden="true" className="chart-swatch inline-block size-3.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1">{s.label}</span>
                <span className="tabular-nums">{s.value.toLocaleString('pt-BR')}</span>
                <strong className="w-14 text-right tabular-nums">{formatPercent(s.value, total)}</strong>
              </li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  )
}
