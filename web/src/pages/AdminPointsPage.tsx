import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { type AdminPoint, changePointStatus, fetchAdminPoints, type PointStatus } from '../api/admin.ts'
import { Notice } from '../components/forms.tsx'
import { EditIcon, PlusIcon } from '../components/icons.tsx'
import { MATERIAL_LABELS, SOURCE_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { normalizeText } from '../lib/text.ts'
import { INPUT, PAGE, PRIMARY_BUTTON } from '../lib/ui.ts'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'success'; points: AdminPoint[] }
type StatusFilter = 'ALL' | PointStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Desativados' },
]

function matches(point: AdminPoint, terms: string): boolean {
  return [point.name, point.address, point.operator].some((text) => text && normalizeText(text).includes(terms))
}

function StatusBadge({ status }: { status: PointStatus }) {
  return status === 'ACTIVE' ? (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-medium text-emerald-900">Ativo</span>
  ) : (
    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-medium text-slate-800">Desativado</span>
  )
}

export default function AdminPointsPage() {
  const location = useLocation()
  const savedMessage = (location.state as { message?: string } | null)?.message ?? null
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchAdminPoints(controller.signal)
      .then((points) => setState({ status: 'success', points }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [attempt])

  const visible = useMemo(() => {
    if (state.status !== 'success') {
      return []
    }
    const terms = normalizeText(search)
    return state.points.filter(
      (point) => (filter === 'ALL' || point.status === filter) && (!terms || matches(point, terms)),
    )
  }, [state, search, filter])

  async function toggleStatus(point: AdminPoint) {
    const status: PointStatus = point.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const name = point.name ?? UNNAMED_POINT
    setBusyId(point.id)
    setMessage(null)
    try {
      const updated = await changePointStatus(point.id, status)
      setState((current) =>
        current.status === 'success'
          ? { status: 'success', points: current.points.map((p) => (p.id === updated.id ? updated : p)) }
          : current,
      )
      setMessage({
        kind: 'success',
        text: status === 'INACTIVE' ? `“${name}” foi desativado e saiu do mapa.` : `“${name}” foi reativado e voltou ao mapa.`,
      })
    } catch {
      setMessage({ kind: 'error', text: `Não foi possível alterar “${name}”. Tente de novo.` })
    } finally {
      setBusyId(null)
    }
  }

  function actions(point: AdminPoint) {
    const name = point.name ?? UNNAMED_POINT
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          to={`/admin/pontos/${point.id}`}
          className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline underline-offset-4"
        >
          <EditIcon className="size-4" />
          Editar<span className="sr-only"> {name}</span>
        </Link>
        <button
          type="button"
          onClick={() => toggleStatus(point)}
          disabled={busyId === point.id}
          className="font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-950 disabled:text-slate-400"
        >
          {point.status === 'ACTIVE' ? 'Desativar' : 'Reativar'}
          <span className="sr-only"> {name}</span>
        </button>
      </div>
    )
  }

  return (
    <div className={PAGE}>
      <title>Pontos de coleta | Administração | E-Cicla</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pontos de coleta</h1>
          <p className="mt-1 text-lg text-slate-700">Cadastre, corrija e desative os pontos que aparecem no mapa.</p>
        </div>
        <Link to="/admin/pontos/novo" className={PRIMARY_BUTTON}>
          <PlusIcon className="size-5" />
          Cadastrar ponto
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {savedMessage && !message && <Notice kind="success">{savedMessage}</Notice>}
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="filtro-texto" className="block font-semibold text-slate-900">
            Buscar por nome, endereço ou responsável
          </label>
          <input
            id="filtro-texto"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={INPUT}
          />
        </div>
        <fieldset>
          <legend className="font-semibold text-slate-900">Situação</legend>
          <div className="mt-1 flex rounded-lg bg-slate-100 p-1">
            {FILTERS.map(({ value, label }) => (
              <label
                key={value}
                className="cursor-pointer rounded-md px-3 py-1.5 font-medium text-slate-700 has-[:checked]:bg-white has-[:checked]:text-slate-950 has-[:checked]:shadow-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue-700"
              >
                <input
                  type="radio"
                  name="situacao"
                  value={value}
                  checked={filter === value}
                  onChange={() => setFilter(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700">
          Carregando os pontos…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8">
          <Notice kind="error">
            <p>Não foi possível carregar os pontos.</p>
            <button
              type="button"
              onClick={() => {
                setState({ status: 'loading' })
                setAttempt((value) => value + 1)
              }}
              className="mt-2 font-semibold underline underline-offset-4"
            >
              Tentar de novo
            </button>
          </Notice>
        </div>
      )}

      {state.status === 'success' && (
        <>
          <p role="status" className="mt-6 text-slate-700">
            {visible.length === 1 ? '1 ponto' : `${visible.length} pontos`}
            {visible.length !== state.points.length && ` de ${state.points.length}`}
          </p>

          {/* Table on larger screens */}
          <table className="mt-3 hidden w-full text-left md:table">
            <caption className="sr-only">Pontos de coleta</caption>
            <thead>
              <tr className="border-b border-slate-300 text-sm text-slate-700">
                <th scope="col" className="py-2 pr-3 font-semibold">Nome</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Endereço</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Materiais aceitos</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Origem</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Situação</th>
                <th scope="col" className="py-2 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((point) => (
                <tr key={point.id} className="border-b border-slate-200 align-top">
                  <td className="py-3 pr-3 font-medium text-slate-900">{point.name ?? UNNAMED_POINT}</td>
                  <td className="py-3 pr-3 text-slate-700">{point.address ?? 'Não informado'}</td>
                  <td className="py-3 pr-3 text-slate-700">
                    {point.acceptedMaterials.map((material) => MATERIAL_LABELS[material]).join(', ')}
                  </td>
                  <td className="py-3 pr-3 text-slate-700">
                    {point.sourceType ? SOURCE_LABELS[point.sourceType] : '—'}
                    {point.adminEditedAt && point.sourceType !== 'MANUAL' && (
                      <span className="block text-sm text-slate-600">revisado pela equipe</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={point.status} />
                  </td>
                  <td className="py-3">{actions(point)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards on phones */}
          <ul className="mt-3 space-y-3 md:hidden">
            {visible.map((point) => (
              <li key={point.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-slate-900">{point.name ?? UNNAMED_POINT}</h2>
                  <StatusBadge status={point.status} />
                </div>
                <p className="mt-1 text-slate-700">{point.address ?? 'Endereço não informado'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {point.acceptedMaterials.map((material) => MATERIAL_LABELS[material]).join(', ')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Origem: {point.sourceType ? SOURCE_LABELS[point.sourceType] : '—'}
                  {point.adminEditedAt && point.sourceType !== 'MANUAL' && ', revisado pela equipe'}
                </p>
                <div className="mt-3">{actions(point)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
