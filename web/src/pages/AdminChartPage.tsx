import { useEffect, useMemo, useState } from 'react'

import type { ItemKind } from '../api/devices.ts'
import type { Material } from '../api/points.ts'
import { type DisposalsByPeriod, fetchDisposalsByPeriod, type ReportPeriod } from '../api/reports.ts'
import AdminNav from '../components/AdminNav.tsx'
import BarChart, { type ChartColumn, type ChartSeries } from '../components/BarChart.tsx'
import DonutChart from '../components/DonutChart.tsx'
import { Notice } from '../components/forms.tsx'
import PrintBrand from '../components/PrintBrand.tsx'
import { CATEGORY_LABELS, formatDay, KIND_LABELS } from '../lib/devices.ts'
import { INPUT, PAGE, SECONDARY_BUTTON } from '../lib/ui.ts'

type ChartState = { status: 'loading' } | { status: 'error' } | { status: 'success'; data: DisposalsByPeriod }

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'CURRENT_MONTH', label: 'Mês atual' },
  { value: 'LAST_MONTH', label: 'Último mês (mês passado)' },
  { value: 'LAST_3_MONTHS', label: 'Últimos 3 meses' },
  { value: 'LAST_6_MONTHS', label: 'Últimos 6 meses' },
  { value: 'LAST_12_MONTHS', label: 'Últimos 12 meses' },
]

/** Fixed order and colors; each one has contrast of at least 3:1 against the light and the dark background. */
const SERIES: ChartSeries[] = [
  { key: 'MOBILE_PHONES', label: CATEGORY_LABELS.MOBILE_PHONES, color: '#059669' },
  { key: 'COMPUTERS', label: CATEGORY_LABELS.COMPUTERS, color: '#2563eb' },
  { key: 'BATTERIES', label: CATEGORY_LABELS.BATTERIES, color: '#d97706' },
  { key: 'SMALL_APPLIANCES', label: CATEGORY_LABELS.SMALL_APPLIANCES, color: '#c026d3' },
  { key: 'ELECTRICAL_ITEMS', label: CATEGORY_LABELS.ELECTRICAL_ITEMS, color: '#64748b' },
]
const KIND_COLORS: Record<ItemKind, string> = { DEVICE: '#0f766e', WASTE: '#b45309' }

function bucketLabels(key: string, daily: boolean): { short: string; long: string } {
  if (daily) {
    const [year, month, day] = key.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return { short: String(day).padStart(2, '0'), long: date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) }
  }
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const short = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return { short: `${short}/${String(year).slice(2)}`, long: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
}

function itemCount(n: number): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? 'item' : 'itens'}`
}

/** Evolution of the items delivered on the platform, by kind (PB31). Only aggregated numbers. */
export default function AdminChartPage() {
  const [period, setPeriod] = useState<ReportPeriod>('LAST_12_MONTHS')
  const [category, setCategory] = useState<Material | ''>('')
  const [state, setState] = useState<ChartState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchDisposalsByPeriod(period, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [period, attempt])

  const view = useMemo(() => {
    if (state.status !== 'success') {
      return null
    }
    const daily = state.data.granularity === 'DAY'
    const series = category ? SERIES.filter((s) => s.key === category) : SERIES
    const columns: ChartColumn[] = state.data.buckets.map((b) => {
      const labels = bucketLabels(b.key, daily)
      return { key: b.key, label: labels.short, longLabel: labels.long, values: b.byCategory }
    })
    const totals = state.data.buckets.map((b) => series.reduce((sum, s) => sum + (b.byCategory[s.key as Material] ?? 0), 0))
    const total = totals.reduce((a, b) => a + b, 0)
    const best = totals.indexOf(Math.max(...totals))
    return { daily, series, columns, totals, total, best }
  }, [state, category])

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? ''
  const summary = view
    ? `Itens entregues por ${view.daily ? 'dia' : 'mês'}${category ? `, ${CATEGORY_LABELS[category].toLowerCase()}` : ''}: ` +
      view.columns
        .map((c, i) => [c.longLabel, view.totals[i]] as const)
        .filter(([, value]) => !view.daily || value > 0)
        .map(([label, value]) => `${label}, ${value}`)
        .join('; ') +
      '.'
    : ''

  return (
    <div className={PAGE}>
      <title>Gráfico de descartes | Administração | E-Cicla</title>
      <PrintBrand />
      <div className="print:hidden">
        <AdminNav />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 print:text-2xl">Evolução dos descartes</h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
            Itens entregues pelos usuários, por tipo. Pilhas e baterias contam por unidade. Só números somados: não
            mostra quem registrou.
          </p>
        </div>
        {state.status === 'success' && (
          <button type="button" onClick={() => window.print()} className={`${SECONDARY_BUTTON} print:hidden`}>
            Imprimir ou salvar em PDF
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end print:hidden">
        <div>
          <label htmlFor="grafico-periodo" className="block font-semibold text-slate-900 dark:text-slate-100">
            Período
          </label>
          <select
            id="grafico-periodo"
            value={period}
            onChange={(event) => {
              setState({ status: 'loading' })
              setPeriod(event.target.value as ReportPeriod)
            }}
            className={INPUT}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grafico-tipo" className="block font-semibold text-slate-900 dark:text-slate-100">
            Tipo de item
          </label>
          <select
            id="grafico-tipo"
            value={category}
            onChange={(event) => setCategory(event.target.value as Material | '')}
            className={INPUT}
          >
            <option value="">Todos os tipos</option>
            {SERIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700 dark:text-slate-300">
          Carregando o gráfico…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8 space-y-3">
          <Notice kind="error">Não foi possível carregar o gráfico.</Notice>
          <button
            type="button"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
            className={SECONDARY_BUTTON}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {state.status === 'success' && view && (
        <>
          <p className="mt-2 text-slate-600 dark:text-slate-400 print:text-black">
            {periodLabel}: de {formatDay(state.data.from)} a {formatDay(state.data.to)}
            {category && ` · ${CATEGORY_LABELS[category]}`}. Gerado em{' '}
            {new Date(state.data.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-slate-700 dark:text-slate-300">Itens entregues no período</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{itemCount(view.total)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-slate-700 dark:text-slate-300">Entregas registradas</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{state.data.totals.deliveries.toLocaleString('pt-BR')}</dd>
              <dd className="text-sm text-slate-700 dark:text-slate-300">Todos os tipos; uma entrega pode ter várias pilhas.</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-slate-700 dark:text-slate-300">{view.daily ? 'Dia com mais itens' : 'Mês com mais itens'}</dt>
              <dd className="mt-1 text-2xl font-bold first-letter:uppercase">
                {view.total === 0 ? '—' : view.columns[view.best].longLabel}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="grafico-titulo" className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:break-inside-avoid">
            <h2 id="grafico-titulo" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Itens entregues por {view.daily ? 'dia' : 'mês'}
            </h2>
            {view.total === 0 ? (
              <p className="mt-4 text-slate-700 dark:text-slate-300">Ainda não há descartes registrados neste período.</p>
            ) : (
              <div className="mt-4">
                <BarChart
                  series={view.series}
                  columns={view.columns}
                  summary={summary}
                  unit={['item', 'itens']}
                  labelEvery={view.daily ? 5 : 1}
                />
              </div>
            )}
          </section>

          <section aria-labelledby="proporcoes-titulo" className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:break-inside-avoid">
            <h2 id="proporcoes-titulo" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Proporção no período
            </h2>
            <div className="mt-4 grid gap-8 lg:grid-cols-2">
              <DonutChart
                title="Por tipo de item"
                unit={['item', 'itens']}
                segments={view.series.map((s) => ({
                  key: s.key,
                  label: s.label,
                  value: state.data.totals.byCategory[s.key as Material] ?? 0,
                  color: s.color,
                }))}
              />
              <DonutChart
                title="Aparelhos e resíduos soltos"
                unit={['item', 'itens']}
                segments={(['DEVICE', 'WASTE'] as const).map((kind) => ({
                  key: kind,
                  label: KIND_LABELS[kind],
                  value: state.data.totals.byKind[kind] ?? 0,
                  color: KIND_COLORS[kind],
                }))}
              />
            </div>
          </section>

          <details open className="chart-table mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">
              Ver os números em tabela
            </summary>
            <div className="mt-4 overflow-x-auto print:overflow-visible">
              <table className="w-full border-collapse text-left text-sm print:text-xs">
                <caption className="sr-only">Itens entregues por {view.daily ? 'dia' : 'mês'} e por tipo</caption>
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      {view.daily ? 'Dia' : 'Mês'}
                    </th>
                    {view.series.map((s) => (
                      <th key={s.key} scope="col" className="px-3 py-2 text-right">
                        {s.label}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.columns.map((column, index) =>
                    // Daily periods list only the days with deliveries, so the table stays short.
                    view.daily && view.totals[index] === 0 ? null : (
                      <tr key={column.key} className="border-t border-slate-200 dark:border-slate-800">
                        <th scope="row" className="px-3 py-2 font-medium first-letter:uppercase">
                          {column.longLabel}
                        </th>
                        {view.series.map((s) => (
                          <td key={s.key} className="px-3 py-2 text-right tabular-nums">
                            {column.values[s.key] ?? 0}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{view.totals[index]}</td>
                      </tr>
                    ),
                  )}
                </tbody>
                <tfoot className="border-t-2 border-slate-400 font-semibold dark:border-slate-600">
                  <tr>
                    <th scope="row" className="px-3 py-2">
                      Total
                    </th>
                    {view.series.map((s) => (
                      <td key={s.key} className="px-3 py-2 text-right tabular-nums">
                        {state.data.totals.byCategory[s.key as Material]}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums">{view.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
