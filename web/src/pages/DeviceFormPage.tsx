import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  type BatteryType,
  createDevice,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  type DeviceInput,
  fetchDevice,
  updateDevice,
} from '../api/devices.ts'
import type { Material } from '../api/points.ts'
import DeviceIcon from '../components/DeviceIcon.tsx'
import { Notice, TextField } from '../components/forms.tsx'
import { CheckIcon } from '../components/icons.tsx'
import ReadAloudButton from '../components/ReadAloudButton.tsx'
import RequireSignIn from '../components/RequireSignIn.tsx'
import {
  asksBattery,
  asksScreen,
  BATTERY_LABELS,
  DEVICE_KIND_LABELS,
  DEVICE_KINDS,
  preparationTips,
} from '../lib/devices.ts'
import { INPUT, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type Step = 'kind' | 'name' | 'details' | 'confirm'
type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'delivered' } | { status: 'ready' }

const BATTERY_OPTIONS = Object.keys(BATTERY_LABELS) as BatteryType[]

/** Registering or editing a device with simple questions, one at a time (PB09, PB10). */
export default function DeviceFormPage() {
  return (
    <RequireSignIn title="Cadastrar aparelho" reason="Entre na sua conta para cadastrar seus aparelhos.">
      <DeviceForm />
    </RequireSignIn>
  )
}

function DeviceForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [load, setLoad] = useState<LoadState>(editing ? { status: 'loading' } : { status: 'ready' })
  const [step, setStep] = useState<Step>('kind')
  const [kind, setKind] = useState<Material | null>(null)
  const [description, setDescription] = useState('')
  const [battery, setBattery] = useState<BatteryType | ''>('')
  const [screen, setScreen] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }
    const controller = new AbortController()
    fetchDevice(id, controller.signal)
      .then((device) => {
        if (device.status === 'DISPOSED') {
          setLoad({ status: 'delivered' })
          return
        }
        setKind(device.category)
        setDescription(device.description)
        setBattery(device.details?.batteryType ?? '')
        setScreen(device.details?.screenSizeInches ? String(device.details.screenSizeInches) : '')
        setLoad({ status: 'ready' })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoad({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [id])

  // Each new question gets the focus, so screen readers announce it.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  const hasDetails = kind !== null && (asksBattery(kind) || asksScreen(kind))
  const steps: Step[] = hasDetails ? ['kind', 'name', 'details', 'confirm'] : ['kind', 'name', 'confirm']
  const position = steps.indexOf(step) + 1

  function next(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (step === 'kind') {
      if (!kind) {
        setError('Escolha o tipo de aparelho.')
        return
      }
      setStep('name')
    } else if (step === 'name') {
      const text = description.trim()
      if (text.length < DESCRIPTION_MIN || text.length > DESCRIPTION_MAX) {
        setError(`Escreva um nome com ${DESCRIPTION_MIN} a ${DESCRIPTION_MAX} letras.`)
        return
      }
      setStep(hasDetails ? 'details' : 'confirm')
    } else if (step === 'details') {
      const size = screen.trim() ? Number(screen.replace(',', '.')) : null
      if (size !== null && (Number.isNaN(size) || size < 1 || size > 100)) {
        setError('Informe o tamanho da tela entre 1 e 100 polegadas, ou deixe em branco.')
        return
      }
      setStep('confirm')
    } else {
      void save()
    }
  }

  function back() {
    setError(null)
    setStep(steps[Math.max(0, steps.indexOf(step) - 1)])
  }

  async function save() {
    if (!kind) {
      return
    }
    const size = screen.trim() && asksScreen(kind) ? Number(screen.replace(',', '.')) : null
    const batteryType = battery && asksBattery(kind) ? battery : null
    const input: DeviceInput = {
      category: kind,
      description: description.trim(),
      details: batteryType || size ? { batteryType, screenSizeInches: size } : null,
    }
    setSaving(true)
    try {
      if (id) {
        await updateDevice(id, input)
      } else {
        await createDevice(input)
      }
      navigate('/meus-aparelhos', {
        state: { message: id ? `“${input.description}” foi atualizado.` : `“${input.description}” foi cadastrado.` },
      })
    } catch {
      setError('Não foi possível salvar o aparelho. Tente de novo.')
      setSaving(false)
    }
  }

  const title = editing ? 'Editar aparelho' : 'Cadastrar aparelho'
  const tips = kind ? preparationTips(kind, battery || null) : []

  if (load.status !== 'ready') {
    return (
      <div className={PAGE}>
        <title>{`${title} | E-Cicla`}</title>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {load.status === 'loading' && (
          <p role="status" className="mt-4 text-slate-700 dark:text-slate-300">
            Carregando…
          </p>
        )}
        {load.status === 'error' && (
          <div className="mt-4">
            <Notice kind="error">Não foi possível carregar este aparelho.</Notice>
          </div>
        )}
        {load.status === 'delivered' && (
          <div className="mt-4">
            <Notice kind="info">Este aparelho já foi entregue e não pode mais ser editado.</Notice>
          </div>
        )}
        <p className="mt-6">
          <Link to="/meus-aparelhos" className={TEXT_LINK}>
            Voltar para meus aparelhos
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className={`${PAGE} max-w-3xl`}>
      <title>{`${title} | E-Cicla`}</title>
      <p className="text-slate-700 dark:text-slate-300">
        <Link to="/meus-aparelhos" className={TEXT_LINK}>
          Meus aparelhos
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-1 text-slate-700 dark:text-slate-300">
        {/* How many questions depends on the kind of device, so the total shows only after choosing it. */}
        {kind ? `Pergunta ${position} de ${steps.length}` : 'Pergunta 1'}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label="Progresso do cadastro"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={position}
      >
        <div className="h-full bg-emerald-700 transition-[width] motion-reduce:transition-none" style={{ width: `${(position / steps.length) * 100}%` }} />
      </div>

      <form onSubmit={next} noValidate className="mt-6">
        {error && (
          <div className="mb-4">
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        {step === 'kind' && (
          <fieldset>
            <legend>
              <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Que tipo de aparelho é?
              </h2>
            </legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DEVICE_KINDS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-400 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-700 dark:border-slate-700 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40"
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={option.value}
                    checked={kind === option.value}
                    onChange={() => setKind(option.value)}
                    className="sr-only"
                  />
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    <DeviceIcon kind={option.value} />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900 dark:text-slate-100">{option.label}</span>
                    <span className="block text-sm text-slate-700 dark:text-slate-300">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {step === 'name' && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Como você chama este aparelho?
            </h2>
            <div className="mt-4">
              <TextField
                label="Nome do aparelho"
                hint="Um nome para você reconhecer, por exemplo: “Celular antigo da sala”."
                value={description}
                maxLength={DESCRIPTION_MAX}
                onChange={(event) => setDescription(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {step === 'details' && kind && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Alguns detalhes (opcional)
            </h2>
            <p className="mt-1 text-slate-700 dark:text-slate-300">
              Ajudam a dar orientações mais certas. Se não souber, deixe em branco.
            </p>
            <div className="mt-4 space-y-4">
              {asksBattery(kind) && (
                <div>
                  <label htmlFor="bateria" className="block font-semibold text-slate-900 dark:text-slate-100">
                    Que tipo de bateria ou pilha ele usa?
                  </label>
                  <select
                    id="bateria"
                    value={battery}
                    onChange={(event) => setBattery(event.target.value as BatteryType | '')}
                    className={INPUT}
                  >
                    <option value="">Prefiro não informar</option>
                    {BATTERY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {BATTERY_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {asksScreen(kind) && (
                <TextField
                  label="Tamanho da tela, em polegadas"
                  hint="Por exemplo: 6,5 para um celular ou 14 para um notebook."
                  inputMode="decimal"
                  value={screen}
                  onChange={(event) => setScreen(event.target.value)}
                />
              )}
            </div>
          </div>
        )}

        {step === 'confirm' && kind && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Confira e veja como preparar
            </h2>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                <DeviceIcon kind={kind} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900 dark:text-slate-100">{description.trim()}</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {DEVICE_KIND_LABELS[kind]}
                  {battery && asksBattery(kind) && ` · ${BATTERY_LABELS[battery]}`}
                  {screen.trim() && asksScreen(kind) && ` · tela de ${screen.trim()} polegadas`}
                </span>
              </span>
            </div>

            <section aria-labelledby="preparo-titulo" className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="preparo-titulo" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Antes de levar
                </h3>
                <ReadAloudButton size="sm" label="Ouvir orientações" text={`Antes de levar. ${tips.join(' ')}`} />
              </div>
              <ul className="mt-3 space-y-2">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-3 text-slate-800 dark:text-slate-200">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <CheckIcon className="size-4" />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step !== 'kind' && (
            <button type="button" onClick={back} className={SECONDARY_BUTTON}>
              Voltar
            </button>
          )}
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
            {step === 'confirm' ? (saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar aparelho') : 'Continuar'}
          </button>
        </div>
      </form>
    </div>
  )
}
