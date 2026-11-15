import { type FormEvent, useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { isApiError } from '../api/client.ts'
import { type Device, fetchDevices } from '../api/devices.ts'
import { createDisposal } from '../api/disposals.ts'
import type { Material, PointSummary } from '../api/points.ts'
import { useAuth } from '../auth/useAuth.ts'
import { DEVICE_KIND_LABELS, todayInSaoPaulo } from '../lib/devices.ts'
import { MATERIAL_LABELS } from '../lib/materials.ts'
import { loginPath } from '../lib/navigation.ts'
import { INPUT, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type DevicesState = { status: 'loading' } | { status: 'error' } | { status: 'success'; devices: Device[] }

interface DeliverySectionProps {
  point: PointSummary
  /** Device chosen in "Meus aparelhos" before coming to the map (?entregar=<id>). */
  preselectedDeviceId?: string | null
  onChooseAnotherPoint: () => void
}

function accepts(point: PointSummary, kind: Material): boolean {
  return point.acceptedMaterials.includes(kind)
}

/**
 * Registering that a device was delivered at this point (PB15), with the warning when the point does not
 * say it accepts that kind of device (PB11). Shown inside the point details panel.
 */
export default function DeliverySection({ point, preselectedDeviceId, onChooseAnotherPoint }: DeliverySectionProps) {
  const { status: authStatus } = useAuth()
  const location = useLocation()
  const formId = useId()
  const [state, setState] = useState<DevicesState>({ status: 'loading' })
  const [open, setOpen] = useState(Boolean(preselectedDeviceId))
  const [deviceId, setDeviceId] = useState<string>(preselectedDeviceId ?? '')
  const [day, setDay] = useState(todayInSaoPaulo())
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (authStatus !== 'signed-in') {
      return
    }
    const controller = new AbortController()
    fetchDevices(controller.signal)
      .then((devices) => setState({ status: 'success', devices }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [authStatus])

  if (authStatus === 'checking') {
    return null
  }
  if (authStatus === 'signed-out') {
    return (
      <p className="text-sm text-slate-700 dark:text-slate-300">
        <Link to={loginPath(location.pathname + location.search)} className={TEXT_LINK}>
          Entre na sua conta
        </Link>{' '}
        para registrar a entrega dos seus aparelhos.
      </p>
    )
  }
  if (state.status !== 'success') {
    return null
  }

  const waiting = state.devices.filter((d) => d.status === 'REGISTERED')
  if (waiting.length === 0) {
    return result?.kind === 'success' ? (
      <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p>{result.text}</p>
        <Link to="/meus-descartes" className={TEXT_LINK}>
          Ver meus descartes
        </Link>
      </div>
    ) : (
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Cadastre seus aparelhos em{' '}
        <Link to="/meus-aparelhos" className={TEXT_LINK}>
          Meus aparelhos
        </Link>{' '}
        para registrar quando entregá-los.
      </p>
    )
  }

  const notAccepted = waiting.filter((d) => !accepts(point, d.category))
  const chosen = waiting.find((d) => d.id === deviceId) ?? null
  const chosenNotAccepted = chosen !== null && !accepts(point, chosen.category)

  async function register(confirmNotAccepted: boolean) {
    if (!chosen) {
      return
    }
    setBusy(true)
    setResult(null)
    try {
      await createDisposal({ deviceId: chosen.id, pointId: point.id, disposedOn: day, confirmNotAccepted })
      setState((current) =>
        current.status === 'success'
          ? {
              status: 'success',
              devices: current.devices.map((d) => (d.id === chosen.id ? { ...d, status: 'DISPOSED' } : d)),
            }
          : current,
      )
      setResult({ kind: 'success', text: `Entrega de “${chosen.description}” registrada. Obrigado por descartar certo!` })
      setOpen(false)
      setConfirming(false)
      setDeviceId('')
    } catch (error) {
      if (isApiError(error, 422)) {
        setConfirming(true)
      } else {
        setResult({ kind: 'error', text: 'Não foi possível registrar a entrega. Confira a data e tente de novo.' })
      }
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (chosenNotAccepted) {
      setConfirming(true)
      return
    }
    void register(false)
  }

  return (
    <section aria-labelledby={`${formId}-titulo`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <h3 id={`${formId}-titulo`} className="font-semibold text-slate-900 dark:text-slate-100">
        Meus aparelhos
      </h3>
      {notAccepted.length > 0 && (
        <p className="mt-1 text-sm text-amber-900 dark:text-amber-200">
          Este ponto não informa que recebe: {notAccepted.map((d) => d.description).join(', ')}.
        </p>
      )}
      {result && (
        <div
          role={result.kind === 'error' ? 'alert' : 'status'}
          className={`mt-2 rounded-lg p-3 text-sm ${result.kind === 'success' ? 'bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100' : 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200'}`}
        >
          <p>{result.text}</p>
          {result.kind === 'success' && (
            <Link to="/meus-descartes" className={TEXT_LINK}>
              Ver meus descartes
            </Link>
          )}
        </div>
      )}

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={`${SECONDARY_BUTTON} mt-3 w-full`}>
          Registrar entrega aqui
        </button>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3" aria-label="Registrar entrega neste ponto">
          <div>
            <label htmlFor={`${formId}-aparelho`} className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Qual aparelho você entregou?
            </label>
            <select
              id={`${formId}-aparelho`}
              required
              value={deviceId}
              onChange={(event) => {
                setDeviceId(event.target.value)
                setConfirming(false)
              }}
              className={INPUT}
            >
              <option value="">Escolha um aparelho</option>
              {waiting.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.description} ({DEVICE_KIND_LABELS[d.category]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${formId}-dia`} className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Quando?
            </label>
            <input
              id={`${formId}-dia`}
              type="date"
              required
              value={day}
              max={todayInSaoPaulo()}
              onChange={(event) => setDay(event.target.value)}
              className={INPUT}
            />
          </div>

          {confirming && chosen && (
            <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">
                Atenção: este ponto não informa que recebe {DEVICE_KIND_LABELS[chosen.category].toLowerCase()}.
              </p>
              <p className="mt-1">
                Ele recebe: {point.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')}. Confira antes de ir ou
                escolha outro ponto.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onChooseAnotherPoint} className={SECONDARY_BUTTON}>
                  Escolher outro ponto
                </button>
                <button type="button" disabled={busy} onClick={() => void register(true)} className={PRIMARY_BUTTON}>
                  Registrar mesmo assim
                </button>
              </div>
            </div>
          )}

          {!confirming && (
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy || !deviceId} className={PRIMARY_BUTTON}>
                {busy ? 'Registrando…' : 'Registrar entrega'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setConfirming(false)
                }}
                className={SECONDARY_BUTTON}
              >
                Cancelar
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  )
}
