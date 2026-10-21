import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import {
  deleteMySuggestion,
  fetchMySuggestions,
  type SuggestionItem,
  type SuggestionStatus,
} from '../api/suggestions.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Notice } from '../components/forms.tsx'
import { EditIcon, MapPinIcon, PlusIcon } from '../components/icons.tsx'
import { MATERIAL_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { loginPath } from '../lib/navigation.ts'
import { DANGER_BUTTON, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'success'; items: SuggestionItem[] }

const STATUS_BADGE: Record<SuggestionStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Em análise',
    className: 'bg-amber-100 text-amber-950',
  },
  APPROVED: {
    label: 'Aprovada',
    className: 'bg-emerald-100 text-emerald-900',
  },
  REJECTED: {
    label: 'Não aprovada',
    className: 'bg-red-100 text-red-900',
  },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function SuggestionsPage() {
  const { status: authStatus } = useAuth()
  const location = useLocation()
  const savedMessage = (location.state as { message?: string } | null)?.message ?? null
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (authStatus !== 'signed-in') {
      return
    }
    const controller = new AbortController()
    fetchMySuggestions(controller.signal)
      .then((items) => setState({ status: 'success', items }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [authStatus, attempt])

  if (authStatus === 'checking') {
    return (
      <div className={PAGE}>
        <p role="status" className="text-slate-700">
          Carregando…
        </p>
      </div>
    )
  }

  if (authStatus === 'signed-out') {
    return (
      <div className={PAGE}>
        <title>Sugestões de pontos | E-Cicla</title>
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900">Sugira pontos e ajude sua região</h1>
          <p className="mt-3 text-lg text-slate-700">
            Conhece um ponto de coleta de lixo eletrônico que ainda não está no mapa, ou viu alguma informação que
            mudou? Com uma conta gratuita, você pode enviar sugestões e acompanhar a avaliação da equipe do E-Cicla.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={loginPath('/sugestoes')} className={PRIMARY_BUTTON}>
              Entrar na minha conta
            </Link>
            <Link to="/criar-conta?depois=%2Fsugestoes" className={SECONDARY_BUTTON}>
              Criar conta gratuita
            </Link>
          </div>
        </div>
      </div>
    )
  }

  async function handleDelete(item: SuggestionItem) {
    const title = item.proposed.name ?? item.currentPointName ?? UNNAMED_POINT
    setBusyId(item.id)
    setConfirmDeleteId(null)
    setMessage(null)
    try {
      await deleteMySuggestion(item.id)
      setState((current) =>
        current.status === 'success'
          ? { status: 'success', items: current.items.filter((s) => s.id !== item.id) }
          : current,
      )
      setMessage({
        kind: 'success',
        text: `Sua sugestão para “${title}” foi excluída.`,
      })
    } catch {
      setMessage({
        kind: 'error',
        text: `Não foi possível excluir a sugestão para “${title}”. Tente de novo.`,
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={PAGE}>
      <title>Minhas sugestões | E-Cicla</title>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Minhas sugestões</h1>
          <p className="mt-1 text-lg text-slate-700">
            Sugira novos pontos de coleta ou acompanhe as correções que você enviou. Para corrigir um ponto que já
            existe, abra-o no{' '}
            <Link to="/mapa" className={TEXT_LINK}>
              mapa de pontos
            </Link>{' '}
            e escolha “Sugerir correção”.
          </p>
        </div>
        <Link to="/sugestoes/nova" className={PRIMARY_BUTTON}>
          <PlusIcon className="size-5" />
          Sugerir novo ponto
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {savedMessage && !message && <Notice kind="success">{savedMessage}</Notice>}
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700">
          Carregando suas sugestões…
        </p>
      )}

      {state.status === 'error' && (
        <div className="mt-8">
          <Notice kind="error">
            <p>Não foi possível carregar suas sugestões.</p>
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

      {state.status === 'success' && state.items.length === 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-semibold text-slate-900">Você ainda não enviou nenhuma sugestão</h2>
          <p className="mt-2 text-slate-700">
            Ajude outras pessoas a descartar seus aparelhos corretamente indicando um ponto de coleta da sua cidade ou
            sugerindo correções num ponto do mapa.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/sugestoes/nova" className={PRIMARY_BUTTON}>
              <PlusIcon className="size-5" />
              Sugerir novo ponto
            </Link>
            <Link to="/mapa" className={SECONDARY_BUTTON}>
              <MapPinIcon className="size-5" />
              Ver pontos no mapa
            </Link>
          </div>
        </div>
      )}

      {state.status === 'success' && state.items.length > 0 && (
        <ul className="mt-6 space-y-4">
          {state.items.map((item) => {
            const badge = STATUS_BADGE[item.status]
            const title = item.proposed.name ?? item.currentPointName ?? UNNAMED_POINT
            const confirmingDelete = confirmDeleteId === item.id
            return (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-slate-600">
                      {item.type === 'NEW_POINT'
                        ? 'Sugestão de novo ponto'
                        : `Sugestão de correção${item.currentPointName ? ` em “${item.currentPointName}”` : ''}`}
                      {' · '}Enviada em {formatDate(item.createdAt)}
                    </span>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-slate-700 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-semibold text-slate-600">Endereço proposto</dt>
                    <dd className="mt-0.5 text-slate-900">{item.proposed.address ?? 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-600">Materiais aceitos</dt>
                    <dd className="mt-0.5 text-slate-900">
                      {item.proposed.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')}
                    </dd>
                  </div>
                  {item.proposed.openingHours && (
                    <div>
                      <dt className="text-sm font-semibold text-slate-600">Horário de funcionamento</dt>
                      <dd className="mt-0.5 text-slate-900">{item.proposed.openingHours}</dd>
                    </div>
                  )}
                  {item.comment && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-semibold text-slate-600">Seu comentário</dt>
                      <dd className="mt-0.5 text-slate-900">{item.comment}</dd>
                    </div>
                  )}
                </dl>

                {item.status !== 'PENDING' && (
                  <div
                    className={`mt-4 rounded-lg border p-3 text-sm ${
                      item.status === 'APPROVED'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                        : 'border-red-200 bg-red-50 text-red-950'
                    }`}
                  >
                    <p className="font-semibold">
                      {item.status === 'APPROVED'
                        ? `Sugestão aprovada pela equipe${item.reviewedAt ? ` em ${formatDate(item.reviewedAt)}` : ''}. O ponto já está atualizado no mapa.`
                        : `Sugestão avaliada pela equipe${item.reviewedAt ? ` em ${formatDate(item.reviewedAt)}` : ''}.`}
                    </p>
                    {item.reviewReason && <p className="mt-1">Motivo informado: {item.reviewReason}</p>}
                  </div>
                )}

                {item.status === 'PENDING' && !confirmingDelete && (
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
                    <Link
                      to={`/sugestoes/${item.id}/editar`}
                      className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline underline-offset-4"
                    >
                      <EditIcon className="size-4" />
                      Editar<span className="sr-only"> sugestão para {title}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="font-semibold text-red-800 underline underline-offset-4 hover:text-red-950 disabled:text-slate-400"
                    >
                      Excluir<span className="sr-only"> sugestão para {title}</span>
                    </button>
                  </div>
                )}

                {item.status === 'PENDING' && confirmingDelete && (
                  <div
                    role="region"
                    aria-label="Confirmar exclusão da sugestão"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950"
                  >
                    <p className="font-semibold">Excluir a sugestão para “{title}”?</p>
                    <p className="mt-1 text-sm">
                      A sugestão será apagada do banco de dados e não será enviada para avaliação.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void handleDelete(item)}
                        className={DANGER_BUTTON}
                      >
                        {busyId === item.id ? 'Excluindo…' : 'Sim, excluir sugestão'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className={SECONDARY_BUTTON}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
