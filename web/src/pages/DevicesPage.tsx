import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { deleteDevice, type Device, fetchDevices, type ItemKind } from '../api/devices.ts'
import DeviceIcon from '../components/DeviceIcon.tsx'
import { Notice } from '../components/forms.tsx'
import { EditIcon, MapPinIcon, PlusIcon } from '../components/icons.tsx'
import RequireSignIn from '../components/RequireSignIn.tsx'
import { itemLabel, KIND_LABELS, units } from '../lib/devices.ts'
import { DANGER_BUTTON, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'success'; devices: Device[] }

const KINDS: ItemKind[] = ['DEVICE', 'WASTE']

/**
 * "Meus itens" (PB09): what the person registered to dispose of, with whole devices separated from loose
 * waste such as batteries.
 */
export default function DevicesPage() {
  return (
    <RequireSignIn
      title="Meus itens"
      reason="Entre na sua conta para cadastrar os aparelhos, pilhas e baterias que você quer descartar e registrar quando entregá-los."
    >
      <DevicesList />
    </RequireSignIn>
  )
}

function DevicesList() {
  const location = useLocation()
  const savedMessage = (location.state as { message?: string } | null)?.message ?? null
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchDevices(controller.signal)
      .then((devices) => setState({ status: 'success', devices }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [attempt])

  async function remove(device: Device) {
    setConfirmId(null)
    setMessage(null)
    try {
      await deleteDevice(device.id)
      setState((current) =>
        current.status === 'success'
          ? { status: 'success', devices: current.devices.filter((d) => d.id !== device.id) }
          : current,
      )
      setMessage({ kind: 'success', text: `“${device.description}” foi excluído da sua lista.` })
    } catch {
      setMessage({ kind: 'error', text: `Não foi possível excluir “${device.description}”. Tente de novo.` })
    }
  }

  const all = state.status === 'success' ? state.devices : []
  const waiting = all.filter((d) => d.status === 'REGISTERED')
  const delivered = all.filter((d) => d.status === 'DISPOSED')

  function describe(device: Device): string {
    return device.kind === 'WASTE'
      ? `${itemLabel(device.kind, device.category)} · ${units(device.quantity)}`
      : itemLabel(device.kind, device.category)
  }

  function waitingItem(device: Device) {
    return (
      <li key={device.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <DeviceIcon kind={device.category} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{device.description}</p>
            <p className="text-slate-700 dark:text-slate-300">
              {describe(device)} · Cadastrado em {new Date(device.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        {confirmId === device.id ? (
          <div role="region" aria-label="Confirmação" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-slate-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Excluir “{device.description}” da sua lista?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void remove(device)} className={DANGER_BUTTON}>
                Sim, excluir
              </button>
              <button type="button" onClick={() => setConfirmId(null)} className={SECONDARY_BUTTON}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link to={`/mapa?entregar=${encodeURIComponent(device.id)}`} className={`${TEXT_LINK} inline-flex items-center gap-1`}>
              <MapPinIcon className="size-4" />
              Registrar entrega<span className="sr-only"> de {device.description}</span>
            </Link>
            <Link to={`/meus-aparelhos/${device.id}/editar`} className={`${TEXT_LINK} inline-flex items-center gap-1`}>
              <EditIcon className="size-4" />
              Editar<span className="sr-only"> {device.description}</span>
            </Link>
            <button
              type="button"
              onClick={() => setConfirmId(device.id)}
              className="font-semibold text-red-800 underline underline-offset-4 hover:text-red-950 dark:text-red-300"
            >
              Excluir<span className="sr-only"> {device.description}</span>
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className={PAGE}>
      <title>Meus itens | E-Cicla</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Meus itens</h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
            Cadastre os aparelhos e as pilhas, baterias e acessórios que você quer descartar e registre quando entregar.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/meus-descartes" className={SECONDARY_BUTTON}>
            Meus descartes
          </Link>
          <Link to="/meus-aparelhos/novo" className={PRIMARY_BUTTON}>
            <PlusIcon className="size-5" />
            Cadastrar item
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {savedMessage && !message && <Notice kind="success">{savedMessage}</Notice>}
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700 dark:text-slate-300">
          Carregando seus itens…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8 space-y-3">
          <Notice kind="error">Não foi possível carregar seus itens.</Notice>
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
      {state.status === 'success' && all.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-lg text-slate-800 dark:text-slate-200">Você ainda não cadastrou nada.</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            Cadastre um celular antigo, um saco de pilhas usadas ou outro item para receber orientações e lembretes.
          </p>
          <Link to="/meus-aparelhos/novo" className={`${PRIMARY_BUTTON} mt-4`}>
            <PlusIcon className="size-5" />
            Cadastrar item
          </Link>
        </div>
      )}

      {waiting.length > 0 && (
        <section aria-labelledby="itens-aguardando" className="mt-8">
          <h2 id="itens-aguardando" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Para entregar
          </h2>
          {KINDS.map((kind) => {
            const items = waiting.filter((d) => d.kind === kind)
            if (items.length === 0) {
              return null
            }
            return (
              <section key={kind} aria-labelledby={`aguardando-${kind}`} className="mt-4">
                <h3 id={`aguardando-${kind}`} className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  {KIND_LABELS[kind]} ({kind === 'WASTE' ? units(items.reduce((sum, d) => sum + d.quantity, 0)) : items.length})
                </h3>
                <ul className="mt-2 space-y-3">{items.map(waitingItem)}</ul>
              </section>
            )
          })}
        </section>
      )}

      {delivered.length > 0 && (
        <section aria-labelledby="itens-entregues" className="mt-8">
          <h2 id="itens-entregues" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Já entregues ({delivered.length})
          </h2>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            Veja onde e quando em{' '}
            <Link to="/meus-descartes" className={TEXT_LINK}>
              Meus descartes
            </Link>
            .
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {delivered.map((device) => (
              <li key={device.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <DeviceIcon kind={device.category} className="size-5" />
                </span>
                <span>
                  <span className="block font-medium text-slate-900 dark:text-slate-100">{device.description}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{describe(device)} · Entregue</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
