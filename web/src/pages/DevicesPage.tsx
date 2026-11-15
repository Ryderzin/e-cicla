import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { deleteDevice, type Device, fetchDevices } from '../api/devices.ts'
import DeviceIcon from '../components/DeviceIcon.tsx'
import { Notice } from '../components/forms.tsx'
import { EditIcon, MapPinIcon, PlusIcon } from '../components/icons.tsx'
import RequireSignIn from '../components/RequireSignIn.tsx'
import { DEVICE_KIND_LABELS } from '../lib/devices.ts'
import { DANGER_BUTTON, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type ListState = { status: 'loading' } | { status: 'error' } | { status: 'success'; devices: Device[] }

/** "Meus aparelhos" (PB09): the devices the person registered, to deliver or already delivered. */
export default function DevicesPage() {
  return (
    <RequireSignIn
      title="Meus aparelhos"
      reason="Entre na sua conta para cadastrar os aparelhos que você quer descartar e registrar quando entregá-los."
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

  const waiting = state.status === 'success' ? state.devices.filter((d) => d.status === 'REGISTERED') : []
  const delivered = state.status === 'success' ? state.devices.filter((d) => d.status === 'DISPOSED') : []

  return (
    <div className={PAGE}>
      <title>Meus aparelhos | E-Cicla</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Meus aparelhos</h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
            Cadastre o que você quer descartar e registre quando entregar num ponto de coleta.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/meus-descartes" className={SECONDARY_BUTTON}>
            Meus descartes
          </Link>
          <Link to="/meus-aparelhos/novo" className={PRIMARY_BUTTON}>
            <PlusIcon className="size-5" />
            Cadastrar aparelho
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {savedMessage && !message && <Notice kind="success">{savedMessage}</Notice>}
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700 dark:text-slate-300">
          Carregando seus aparelhos…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8 space-y-3">
          <Notice kind="error">Não foi possível carregar seus aparelhos.</Notice>
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
      {state.status === 'success' && state.devices.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-lg text-slate-800 dark:text-slate-200">Você ainda não cadastrou nenhum aparelho.</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">
            Cadastre um celular antigo, pilhas ou outro aparelho para receber orientações e lembretes.
          </p>
          <Link to="/meus-aparelhos/novo" className={`${PRIMARY_BUTTON} mt-4`}>
            <PlusIcon className="size-5" />
            Cadastrar aparelho
          </Link>
        </div>
      )}

      {waiting.length > 0 && (
        <section aria-labelledby="aparelhos-aguardando" className="mt-8">
          <h2 id="aparelhos-aguardando" className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Ainda não entregues ({waiting.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {waiting.map((device) => (
              <li key={device.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    <DeviceIcon kind={device.category} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{device.description}</p>
                    <p className="text-slate-700 dark:text-slate-300">
                      {DEVICE_KIND_LABELS[device.category]} · Cadastrado em{' '}
                      {new Date(device.createdAt).toLocaleDateString('pt-BR')}
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
            ))}
          </ul>
        </section>
      )}

      {delivered.length > 0 && (
        <section aria-labelledby="aparelhos-entregues" className="mt-8">
          <h2 id="aparelhos-entregues" className="text-xl font-bold text-slate-900 dark:text-slate-100">
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
                  <span className="text-sm text-slate-700 dark:text-slate-300">Entregue</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
