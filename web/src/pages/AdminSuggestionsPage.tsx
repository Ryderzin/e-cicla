import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'

import {
  fetchAdminSuggestions,
  type SuggestionItem,
  type SuggestionStatus,
} from '../api/suggestions.ts'
import AdminNav from '../components/AdminNav.tsx'
import { Notice } from '../components/forms.tsx'
import { MATERIAL_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { PAGE, TEXT_LINK } from '../lib/ui.ts'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'success'; items: SuggestionItem[] }
type StatusFilter = 'ALL' | SuggestionStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Em análise' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Não aprovadas' },
  { value: 'ALL', label: 'Todas' },
]

const STATUS_BADGE: Record<SuggestionStatus, { label: string; className: string }> = {
  PENDING: { label: 'Em análise', className: 'bg-amber-100 text-amber-950' },
  APPROVED: { label: 'Aprovada', className: 'bg-emerald-100 text-emerald-900' },
  REJECTED: { label: 'Não aprovada', className: 'bg-red-100 text-red-900' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function AdminSuggestionsPage() {
  const location = useLocation()
  const savedMessage = (location.state as { message?: string } | null)?.message ?? null
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState<StatusFilter>('PENDING')

  useEffect(() => {
    const controller = new AbortController()
    fetchAdminSuggestions(undefined, controller.signal)
      .then((items) => setState({ status: 'success', items }))
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
    return state.items.filter((item) => filter === 'ALL' || item.status === filter)
  }, [state, filter])

  return (
    <div className={PAGE}>
      <title>Sugestões | Administração | E-Cicla</title>
      <AdminNav />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sugestões da comunidade</h1>
        <p className="mt-1 text-lg text-slate-700">
          Avalie as sugestões de novos pontos e de correções enviadas pelos usuários antes de publicá-las no mapa.
        </p>
      </div>

      {savedMessage && (
        <div className="mt-6">
          <Notice kind="success">{savedMessage}</Notice>
        </div>
      )}

      <div className="mt-6">
        <fieldset>
          <legend className="font-semibold text-slate-900">Situação</legend>
          <div className="mt-1 inline-flex flex-wrap rounded-lg bg-slate-100 p-1">
            {FILTERS.map(({ value, label }) => (
              <label
                key={value}
                className="cursor-pointer rounded-md px-3 py-1.5 font-medium text-slate-700 has-[:checked]:bg-white has-[:checked]:text-slate-950 has-[:checked]:shadow-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue-700"
              >
                <input
                  type="radio"
                  name="situacao-sugestao"
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
          Carregando sugestões…
        </p>
      )}

      {state.status === 'error' && (
        <div className="mt-8">
          <Notice kind="error">
            <p>Não foi possível carregar as sugestões.</p>
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
            {visible.length === 1 ? '1 sugestão' : `${visible.length} sugestões`}
            {visible.length !== state.items.length && ` de ${state.items.length}`}
          </p>

          {visible.length === 0 ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              Nenhuma sugestão encontrada para este filtro.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((item) => {
                const badge = STATUS_BADGE[item.status]
                const title = item.proposed.name ?? item.currentPointName ?? UNNAMED_POINT
                return (
                  <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium text-slate-600">
                          {item.type === 'NEW_POINT'
                            ? 'Novo ponto'
                            : `Correção${item.currentPointName ? ` em “${item.currentPointName}”` : ''}`}
                          {' · '}Enviada em {formatDate(item.createdAt)}
                        </span>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-700">
                      <span className="font-semibold">Endereço:</span> {item.proposed.address ?? 'Não informado'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold">Materiais:</span>{' '}
                      {item.proposed.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')}
                    </p>
                    {item.comment && (
                      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                        <span className="font-semibold">Comentário do usuário:</span> {item.comment}
                      </p>
                    )}

                    <div className="mt-4">
                      <Link to={`/admin/sugestoes/${item.id}`} className={TEXT_LINK}>
                        {item.status === 'PENDING' ? 'Avaliar sugestão' : 'Ver detalhes da avaliação'}
                        <span className="sr-only"> de {title}</span>
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
