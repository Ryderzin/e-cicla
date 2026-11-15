import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { deleteDisposal, type Disposal, type DisposalHistory, fetchDisposals } from '../api/disposals.ts'
import type { Material } from '../api/points.ts'
import DeviceIcon from '../components/DeviceIcon.tsx'
import { Notice } from '../components/forms.tsx'
import RequireSignIn from '../components/RequireSignIn.tsx'
import { DEVICE_KIND_LABELS, DEVICE_KINDS, formatDay } from '../lib/devices.ts'
import { DANGER_BUTTON, PAGE, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type HistoryState = { status: 'loading' } | { status: 'error' } | { status: 'success'; history: DisposalHistory }

/** "Meus descartes" (PB16): every delivery the person registered, with the totals by kind of device. */
export default function DisposalsPage() {
  return (
    <RequireSignIn title="Meus descartes" reason="Entre na sua conta para ver o histórico dos aparelhos que você entregou.">
      <DisposalHistoryView />
    </RequireSignIn>
  )
}

function DisposalHistoryView() {
  const [state, setState] = useState<HistoryState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchDisposals(controller.signal)
      .then((history) => setState({ status: 'success', history }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [attempt])

  async function undo(disposal: Disposal) {
    setConfirmId(null)
    setMessage(null)
    try {
      await deleteDisposal(disposal.id)
      setMessage({
        kind: 'success',
        text: `O registro foi desfeito. “${disposal.deviceDescription}” voltou para a lista de aparelhos a entregar.`,
      })
      setAttempt((n) => n + 1)
    } catch {
      setMessage({ kind: 'error', text: 'Não foi possível desfazer o registro. Tente de novo.' })
    }
  }

  const total = state.status === 'success' ? state.history.totals.total : 0

  return (
    <div className={PAGE}>
      <title>Meus descartes | E-Cicla</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Meus descartes</h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
            Os aparelhos que você registrou como entregues num ponto de coleta.
          </p>
        </div>
        <Link to="/meus-aparelhos" className={SECONDARY_BUTTON}>
          Meus aparelhos
        </Link>
      </div>

      {message && (
        <div className="mt-6">
          <Notice kind={message.kind}>{message.text}</Notice>
        </div>
      )}

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700 dark:text-slate-300">
          Carregando seu histórico…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8 space-y-3">
          <Notice kind="error">Não foi possível carregar seu histórico.</Notice>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={SECONDARY_BUTTON}>
            Tentar de novo
          </button>
        </div>
      )}

      {state.status === 'success' && total === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-lg text-slate-800 dark:text-slate-200">Você ainda não registrou nenhum descarte.</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            Quando entregar um aparelho, abra o ponto no{' '}
            <Link to="/mapa" className={TEXT_LINK}>
              mapa
            </Link>{' '}
            e use “Registrar entrega aqui”.
          </p>
        </div>
      )}

      {state.status === 'success' && total > 0 && (
        <>
          <section aria-labelledby="resumo-descartes" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <h2 id="resumo-descartes" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Você já registrou {total} {total === 1 ? 'descarte' : 'descartes'}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {DEVICE_KINDS.filter((k) => state.history.totals.byCategory[k.value as Material] > 0).map((k) => (
                <li key={k.value} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  <DeviceIcon kind={k.value} className="size-5" />
                  {k.label}: <strong className="tabular-nums">{state.history.totals.byCategory[k.value]}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="lista-descartes" className="mt-8">
            <h2 id="lista-descartes" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Histórico
            </h2>
            <ol className="mt-3 space-y-3">
              {state.history.items.map((disposal) => (
                <li key={disposal.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        <DeviceIcon kind={disposal.deviceCategory} className="size-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{disposal.deviceDescription}</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {DEVICE_KIND_LABELS[disposal.deviceCategory]} · entregue em {formatDay(disposal.disposedOn)} no ponto “
                          {disposal.pointName}”
                        </p>
                        {!disposal.pointAccepted && (
                          <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
                            O ponto não informava aceitar este tipo de aparelho.
                          </p>
                        )}
                      </div>
                    </div>
                    {confirmId !== disposal.id && (
                      <button
                        type="button"
                        onClick={() => setConfirmId(disposal.id)}
                        className="font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-950 dark:text-slate-300"
                      >
                        Desfazer<span className="sr-only"> o registro de {disposal.deviceDescription}</span>
                      </button>
                    )}
                  </div>
                  {confirmId === disposal.id && (
                    <div role="region" aria-label="Confirmação" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-slate-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                      <p className="font-semibold">Desfazer este registro?</p>
                      <p className="text-sm">Use só se registrou por engano. O aparelho volta para a lista de aparelhos a entregar.</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => void undo(disposal)} className={DANGER_BUTTON}>
                          Sim, desfazer
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className={SECONDARY_BUTTON}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  )
}
