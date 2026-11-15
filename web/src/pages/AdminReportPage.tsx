import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import type { PointStatus } from '../api/admin.ts'
import type { Material, SourceType } from '../api/points.ts'
import { fetchPointReport, type PointReport, type ReportFilters, type ReportStatusFilter } from '../api/reports.ts'
import { useAuth } from '../auth/useAuth.ts'
import AdminNav from '../components/AdminNav.tsx'
import { Notice } from '../components/forms.tsx'
import { MATERIAL_LABELS, MATERIALS, SOURCE_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { INPUT, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../lib/ui.ts'

type ReportState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; report: PointReport }

const STATUS_OPTIONS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Desativados' },
]
const STATUS_LABELS: Record<PointStatus, string> = { ACTIVE: 'Ativo', INACTIVE: 'Desativado' }
const SOURCE_REPORT_LABELS: Record<SourceType, string> = {
  ...SOURCE_LABELS,
  MANUAL: 'Cadastro da equipe',
  SUGGESTION: 'Sugestão de usuário',
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Describes the filters used, in plain words, for the header of the printed report. */
function describeFilters(filters: PointReport['filters']): string {
  const parts = [
    filters.status === 'ALL' ? 'todas as situações' : filters.status === 'ACTIVE' ? 'só ativos' : 'só desativados',
    filters.material ? `que aceitam ${MATERIAL_LABELS[filters.material].toLowerCase()}` : 'todos os materiais',
  ]
  if (filters.q) {
    parts.push(`busca “${filters.q}”`)
  }
  return parts.join('; ')
}

/** Collection point report with the totals at the end (PB30). It can be printed or saved as PDF. */
export default function AdminReportPage() {
  const { account } = useAuth()
  const [form, setForm] = useState<ReportFilters>({ status: 'ACTIVE', material: '', q: '' })
  const [state, setState] = useState<ReportState>({ status: 'loading' })
  const [announcement, setAnnouncement] = useState('')

  const load = useCallback((filters: ReportFilters, signal?: AbortSignal) => {
    fetchPointReport(filters, signal)
      .then((report) => {
        setState({ status: 'success', report })
        setAnnouncement(
          `Relatório gerado: ${plural(report.totals.count, 'ponto de coleta', 'pontos de coleta')} no total.`,
        )
      })
      .catch(() => {
        if (!signal?.aborted) {
          setState({ status: 'error' })
        }
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load({ status: 'ACTIVE', material: '', q: '' }, controller.signal)
    return () => controller.abort()
  }, [load])

  function submit(event: FormEvent) {
    event.preventDefault()
    setState({ status: 'loading' })
    setAnnouncement('')
    load(form)
  }

  return (
    <div className={PAGE}>
      <title>Relatório de pontos de coleta | Administração | E-Cicla</title>
      <div className="print:hidden">
        <AdminNav />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 print:text-2xl">
            Relatório de pontos de coleta
          </h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300 print:hidden">
            Escolha os filtros, gere o relatório e confira os totais no final. Você pode imprimir ou salvar em PDF.
          </p>
        </div>
        {state.status === 'success' && (
          <button type="button" onClick={() => window.print()} className={`${SECONDARY_BUTTON} print:hidden`}>
            Imprimir ou salvar em PDF
          </button>
        )}
      </div>

      <form
        onSubmit={submit}
        aria-label="Filtros do relatório"
        className="mt-6 grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-[auto_1fr_1fr_auto] md:items-end dark:border-slate-800 print:hidden"
      >
        <fieldset>
          <legend className="font-semibold text-slate-900 dark:text-slate-100">Situação</legend>
          <div className="mt-1 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="cursor-pointer rounded-md px-3 py-1.5 font-medium text-slate-700 has-[:checked]:bg-white has-[:checked]:text-slate-950 has-[:checked]:shadow-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue-700 dark:text-slate-300 dark:has-[:checked]:bg-slate-900 dark:has-[:checked]:text-slate-100"
              >
                <input
                  type="radio"
                  name="situacao-relatorio"
                  value={value}
                  checked={form.status === value}
                  onChange={() => setForm({ ...form, status: value })}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="relatorio-material" className="block font-semibold text-slate-900 dark:text-slate-100">
            Material aceito
          </label>
          <select
            id="relatorio-material"
            value={form.material}
            onChange={(event) => setForm({ ...form, material: event.target.value as Material | '' })}
            className={INPUT}
          >
            <option value="">Todos os materiais</option>
            {MATERIALS.map((material) => (
              <option key={material} value={material}>
                {MATERIAL_LABELS[material]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="relatorio-busca" className="block font-semibold text-slate-900 dark:text-slate-100">
            Buscar por nome, endereço ou responsável
          </label>
          <input
            id="relatorio-busca"
            type="search"
            value={form.q}
            onChange={(event) => setForm({ ...form, q: event.target.value })}
            className={INPUT}
          />
        </div>
        <button type="submit" className={PRIMARY_BUTTON}>
          Gerar relatório
        </button>
      </form>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700 dark:text-slate-300">
          Gerando o relatório…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8">
          <Notice kind="error">Não foi possível gerar o relatório. Tente de novo.</Notice>
        </div>
      )}
      {state.status === 'success' && <ReportBody report={state.report} adminName={account?.name ?? ''} />}
    </div>
  )
}

function ReportBody({ report, adminName }: { report: PointReport; adminName: string }) {
  const { items, totals } = report
  return (
    <section aria-labelledby="relatorio-resultado" className="mt-8">
      <h2 id="relatorio-resultado" className="sr-only">
        Resultado do relatório
      </h2>
      <p className="text-slate-700 dark:text-slate-300 print:text-black">
        Emitido em {formatDateTime(report.generatedAt)}
        {adminName && <> por {adminName}</>}. Filtros: {describeFilters(report.filters)}.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 p-6 text-slate-700 dark:border-slate-800 dark:text-slate-300">
          Nenhum ponto encontrado com esses filtros. Total: 0.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:overflow-visible print:rounded-none print:border-0">
          <table className="report-table w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Pontos de coleta do relatório, com a totalização na última linha
            </caption>
            <thead className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Nº
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Nome
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Endereço
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Materiais aceitos
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Situação
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Origem
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Atualizado em
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-t border-slate-200 align-top dark:border-slate-800">
                  <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2 font-medium">{item.name ?? `${UNNAMED_POINT} (sem nome)`}</td>
                  <td className="px-3 py-2">
                    {item.address ?? 'Não informado'}
                    {item.addressApproximate && (
                      <span className="block text-xs text-slate-600 dark:text-slate-400 print:text-black">
                        (endereço aproximado)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{item.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')}</td>
                  <td className="px-3 py-2">{STATUS_LABELS[item.status]}</td>
                  <td className="px-3 py-2">{item.sourceType ? SOURCE_REPORT_LABELS[item.sourceType] : '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-400 bg-slate-50 font-semibold dark:border-slate-600 dark:bg-slate-900">
              <tr>
                <th scope="row" colSpan={7} className="px-3 py-3 text-base">
                  Total de pontos no relatório: <span className="tabular-nums">{totals.count}</span>
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <section
        aria-labelledby="relatorio-totais"
        className="report-totals mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-slate-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-slate-100 print:break-inside-avoid"
      >
        <h2 id="relatorio-totais" className="text-xl font-bold">
          Totalização
        </h2>
        <p className="mt-2 text-lg">
          <strong className="tabular-nums">{totals.count}</strong> {totals.count === 1 ? 'ponto de coleta' : 'pontos de coleta'}{' '}
          no relatório: {plural(totals.byStatus.ACTIVE, 'ativo', 'ativos')} e{' '}
          {plural(totals.byStatus.INACTIVE, 'desativado', 'desativados')}.
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Pontos que aceitam cada material</h3>
            <dl className="mt-2 space-y-1">
              {MATERIALS.map((material) => (
                <div key={material} className="flex justify-between gap-4 border-b border-emerald-200/70 pb-1 dark:border-emerald-900/50">
                  <dt>{MATERIAL_LABELS[material]}</dt>
                  <dd className="tabular-nums font-semibold">{totals.byMaterial[material]}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 print:text-black">
              Um ponto pode aceitar mais de um material, por isso esta soma pode ser maior que o total de pontos.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Pontos por origem</h3>
            <dl className="mt-2 space-y-1">
              {(Object.keys(SOURCE_REPORT_LABELS) as SourceType[]).map((source) => (
                <div key={source} className="flex justify-between gap-4 border-b border-emerald-200/70 pb-1 dark:border-emerald-900/50">
                  <dt>{SOURCE_REPORT_LABELS[source]}</dt>
                  <dd className="tabular-nums font-semibold">{totals.bySource[source]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <p className="mt-6 print:hidden">
        <Link to="/admin/pontos" className="font-semibold text-emerald-800 underline underline-offset-4 dark:text-emerald-400">
          Cadastrar, desativar ou excluir pontos
        </Link>
      </p>
    </section>
  )
}
