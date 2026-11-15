import { useEffect, useMemo, useState } from 'react'

import type { Material } from '../api/points.ts'
import { type DisposalsByMonth, fetchDisposalsByMonth } from '../api/reports.ts'
import AdminNav from '../components/AdminNav.tsx'
import BarChart, { type ChartColumn, type ChartSeries } from '../components/BarChart.tsx'
import { Notice } from '../components/forms.tsx'
import { DEVICE_KIND_LABELS } from '../lib/devices.ts'
import { INPUT, PAGE, SECONDARY_BUTTON } from '../lib/ui.ts'

type ChartState = { status: 'loading' } | { status: 'error' } | { status: 'success'; data: DisposalsByMonth }

/** Fixed order and colors; each one has contrast of at least 3:1 against the light and the dark background. */
const SERIES: ChartSeries[] = [
  { key: 'MOBILE_PHONES', label: DEVICE_KIND_LABELS.MOBILE_PHONES, color: '#059669' },
  { key: 'COMPUTERS', label: DEVICE_KIND_LABELS.COMPUTERS, color: '#2563eb' },
  { key: 'BATTERIES', label: DEVICE_KIND_LABELS.BATTERIES, color: '#d97706' },
  { key: 'SMALL_APPLIANCES', label: DEVICE_KIND_LABELS.SMALL_APPLIANCES, color: '#c026d3' },
  { key: 'ELECTRICAL_ITEMS', label: DEVICE_KIND_LABELS.ELECTRICAL_ITEMS, color: '#64748b' },
]

function monthLabels(month: string): { short: string; long: string } {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number - 1, 1)
  const short = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const long = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { short: `${short}/${String(year).slice(2)}`, long }
}

function count(n: number): string {
  return `${n} ${n === 1 ? 'descarte' : 'descartes'}`
}

/** Monthly evolution of the disposals registered on the platform, by kind of device (PB31). */
export default function AdminChartPage() {
  const [months, setMonths] = useState<6 | 12>(12)
  const [kind, setKind] = useState<Material | ''>('')
  const [state, setState] = useState<ChartState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchDisposalsByMonth(months, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [months, attempt])

  const view = useMemo(() => {
    if (state.status !== 'success') {
      return null
    }
    const series = kind ? SERIES.filter((s) => s.key === kind) : SERIES
    const columns: ChartColumn[] = state.data.months.map((m) => {
      const labels = monthLabels(m.month)
      return { key: m.month, label: labels.short, longLabel: labels.long, values: m.byCategory }
    })
    const totals = state.data.months.map((m) => series.reduce((sum, s) => sum + (m.byCategory[s.key as Material] ?? 0), 0))
    const total = totals.reduce((a, b) => a + b, 0)
    const last = totals[totals.length - 1] ?? 0
    const previous = totals[totals.length - 2] ?? 0
    const best = totals.indexOf(Math.max(...totals))
    return { series, columns, totals, total, last, previous, best }
  }, [state, kind])

  const summary = view
    ? `Descartes registrados por mês${kind ? `, ${DEVICE_KIND_LABELS[kind].toLowerCase()}` : ''}: ` +
      view.columns.map((c, i) => `${c.longLabel}, ${view.totals[i]}`).join('; ') +
      '.'
    : ''

  return (
    <div className={PAGE}>
      <title>Gráfico de descartes | Administração | E-Cicla</title>
      <div className="print:hidden">
        <AdminNav />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 print:text-2xl">
            Evolução dos descartes
          </h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
            Descartes registrados pelos usuários a cada mês, por tipo de aparelho. Só números somados: não mostra quem
            registrou.
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
            value={months}
            onChange={(event) => {
              setState({ status: 'loading' })
              setMonths(Number(event.target.value) as 6 | 12)
            }}
            className={INPUT}
          >
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </div>
        <div>
          <label htmlFor="grafico-tipo" className="block font-semibold text-slate-900 dark:text-slate-100">
            Tipo de aparelho
          </label>
          <select
            id="grafico-tipo"
            value={kind}
            onChange={(event) => setKind(event.target.value as Material | '')}
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
            Gerado em {new Date(state.data.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-slate-700 dark:text-slate-300">Total no período</dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{count(view.total)}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-slate-700 dark:text-slate-300 first-letter:uppercase">
                {view.columns[view.columns.length - 1]?.longLabel}
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums">{count(view.last)}</dd>
              <dd className="text-sm text-slate-700 dark:text-slate-300">
                {view.last === view.previous
                  ? 'O mesmo número do mês anterior.'
                  : `${Math.abs(view.last - view.previous)} a ${view.last > view.previous ? 'mais' : 'menos'} que no mês anterior.`}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-slate-700 dark:text-slate-300">Mês com mais descartes</dt>
              <dd className="mt-1 text-2xl font-bold first-letter:uppercase">
                {view.total === 0 ? '—' : view.columns[view.best].longLabel}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="grafico-titulo" className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:break-inside-avoid">
            <h2 id="grafico-titulo" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Descartes por mês
            </h2>
            {view.total === 0 ? (
              <p className="mt-4 text-slate-700 dark:text-slate-300">Ainda não há descartes registrados neste período.</p>
            ) : (
              <div className="mt-4">
                <BarChart series={view.series} columns={view.columns} summary={summary} unit={['descarte', 'descartes']} />
              </div>
            )}
          </section>

          <details open className="chart-table mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">
              Ver os números em tabela
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Descartes registrados por mês e por tipo de aparelho</caption>
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Mês
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
                  {view.columns.map((column, index) => (
                    <tr key={column.key} className="border-t border-slate-200 dark:border-slate-800">
                      <th scope="row" className="px-3 py-2 font-medium capitalize">
                        {column.longLabel}
                      </th>
                      {view.series.map((s) => (
                        <td key={s.key} className="px-3 py-2 text-right tabular-nums">
                          {column.values[s.key] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{view.totals[index]}</td>
                    </tr>
                  ))}
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
