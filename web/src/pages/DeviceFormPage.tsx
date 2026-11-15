import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  type BatteryType,
  createDevice,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  type DeviceInput,
  fetchDevice,
  QUANTITY_MAX,
  updateDevice,
} from '../api/devices.ts'
import DeviceIcon from '../components/DeviceIcon.tsx'
import { Notice, TextField } from '../components/forms.tsx'
import { CheckIcon } from '../components/icons.tsx'
import ReadAloudButton from '../components/ReadAloudButton.tsx'
import RequireSignIn from '../components/RequireSignIn.tsx'
import {
  asksBattery,
  asksScreen,
  BATTERY_LABELS,
  DEVICE_OPTIONS,
  ITEM_OPTIONS,
  type ItemOption,
  KIND_LABELS,
  preparationTips,
  units,
  WASTE_OPTIONS,
} from '../lib/devices.ts'
import { INPUT, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type Step = 'kind' | 'name' | 'details' | 'confirm'
type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'delivered' } | { status: 'ready' }

const BATTERY_OPTIONS = Object.keys(BATTERY_LABELS) as BatteryType[]

function optionKey(option: ItemOption): string {
  return `${option.kind}:${option.category}`
}

/**
 * Registering or editing an item with simple questions, one at a time (PB09, PB10). Whole devices and loose
 * waste (batteries, cables, chargers) are separate choices; loose waste is counted in units.
 */
export default function DeviceFormPage() {
  return (
    <RequireSignIn title="Cadastrar item" reason="Entre na sua conta para cadastrar o que você quer descartar.">
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
  const [choice, setChoice] = useState<ItemOption | null>(null)
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
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
        setChoice(ITEM_OPTIONS.find((o) => o.kind === device.kind && o.category === device.category) ?? null)
        setDescription(device.description)
        setQuantity(String(device.quantity))
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

  const isWaste = choice?.kind === 'WASTE'
  const hasDetails = choice !== null && (asksBattery(choice.category) || asksScreen(choice.kind, choice.category))
  const steps: Step[] = hasDetails ? ['kind', 'name', 'details', 'confirm'] : ['kind', 'name', 'confirm']
  const position = steps.indexOf(step) + 1
  const count = Number(quantity)

  function choose(option: ItemOption) {
    // A suggested name for loose waste, which people rarely name; kept if the person already wrote one.
    if (option.defaultName && (!description.trim() || WASTE_OPTIONS.some((o) => o.defaultName === description))) {
      setDescription(option.defaultName)
    }
    if (option.kind === 'DEVICE' && WASTE_OPTIONS.some((o) => o.defaultName === description)) {
      setDescription('')
    }
    setChoice(option)
  }

  function next(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (step === 'kind') {
      if (!choice) {
        setError('Escolha o que você quer descartar.')
        return
      }
      setStep('name')
    } else if (step === 'name') {
      if (isWaste && (!Number.isInteger(count) || count < 1 || count > QUANTITY_MAX)) {
        setError(`Informe a quantidade, de 1 a ${QUANTITY_MAX}.`)
        return
      }
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
    if (!choice) {
      return
    }
    const size = screen.trim() && asksScreen(choice.kind, choice.category) ? Number(screen.replace(',', '.')) : null
    const batteryType = battery && asksBattery(choice.category) ? battery : null
    const input: DeviceInput = {
      kind: choice.kind,
      category: choice.category,
      description: description.trim(),
      quantity: isWaste ? count : 1,
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
      setError('Não foi possível salvar. Tente de novo.')
      setSaving(false)
    }
  }

  const title = editing ? 'Editar item' : 'Cadastrar item'
  const tips = choice ? preparationTips(choice.kind, choice.category, battery || null) : []

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
            <Notice kind="error">Não foi possível carregar este item.</Notice>
          </div>
        )}
        {load.status === 'delivered' && (
          <div className="mt-4">
            <Notice kind="info">Este item já foi entregue e não pode mais ser editado.</Notice>
          </div>
        )}
        <p className="mt-6">
          <Link to="/meus-aparelhos" className={TEXT_LINK}>
            Voltar para meus itens
          </Link>
        </p>
      </div>
    )
  }

  function optionCards(options: ItemOption[]) {
    return (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={optionKey(option)}
            className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-400 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-700 dark:border-slate-700 dark:has-[:checked]:border-emerald-500 dark:has-[:checked]:bg-emerald-950/40"
          >
            <input
              type="radio"
              name="tipo"
              value={optionKey(option)}
              checked={choice !== null && optionKey(choice) === optionKey(option)}
              onChange={() => choose(option)}
              className="sr-only"
            />
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <DeviceIcon kind={option.category} waste={option.kind === 'WASTE'} />
            </span>
            <span>
              <span className="block font-semibold text-slate-900 dark:text-slate-100">{option.label}</span>
              <span className="block text-sm text-slate-700 dark:text-slate-300">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <div className={`${PAGE} max-w-3xl`}>
      <title>{`${title} | E-Cicla`}</title>
      <p className="text-slate-700 dark:text-slate-300">
        <Link to="/meus-aparelhos" className={TEXT_LINK}>
          Meus itens
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-1 text-slate-700 dark:text-slate-300">
        {/* How many questions depends on what is chosen, so the total shows only after choosing it. */}
        {choice ? `Pergunta ${position} de ${steps.length}` : 'Pergunta 1'}
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
                O que você quer descartar?
              </h2>
            </legend>
            <div role="group" aria-labelledby="grupo-aparelhos" className="mt-4">
              <h3 id="grupo-aparelhos" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Um aparelho
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">Cadastrado um por um, com um nome.</p>
              {optionCards(DEVICE_OPTIONS)}
            </div>
            <div role="group" aria-labelledby="grupo-residuos" className="mt-6">
              <h3 id="grupo-residuos" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Pilhas, baterias ou acessórios soltos
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">Cadastrados de uma vez, informando a quantidade.</p>
              {optionCards(WASTE_OPTIONS)}
            </div>
          </fieldset>
        )}

        {step === 'name' && choice && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isWaste ? 'Quantos são?' : 'Como você chama este aparelho?'}
            </h2>
            <div className="mt-4 space-y-4">
              {isWaste && (
                <TextField
                  label="Quantidade"
                  hint={`Quantas unidades você vai levar, de 1 a ${QUANTITY_MAX}.`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={QUANTITY_MAX}
                  step={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              )}
              <TextField
                label={isWaste ? 'Nome' : 'Nome do aparelho'}
                hint={
                  isWaste
                    ? 'Um nome para você reconhecer, por exemplo: “Pilhas do controle remoto”.'
                    : 'Um nome para você reconhecer, por exemplo: “Celular antigo da sala”.'
                }
                value={description}
                maxLength={DESCRIPTION_MAX}
                onChange={(event) => setDescription(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {step === 'details' && choice && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Alguns detalhes (opcional)
            </h2>
            <p className="mt-1 text-slate-700 dark:text-slate-300">
              Ajudam a dar orientações mais certas. Se não souber, deixe em branco.
            </p>
            <div className="mt-4 space-y-4">
              {asksBattery(choice.category) && (
                <div>
                  <label htmlFor="bateria" className="block font-semibold text-slate-900 dark:text-slate-100">
                    {isWaste ? 'Que tipo de pilha ou bateria são?' : 'Que tipo de bateria ou pilha ele usa?'}
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
              {asksScreen(choice.kind, choice.category) && (
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

        {step === 'confirm' && choice && (
          <div>
            <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Confira e veja como preparar
            </h2>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                <DeviceIcon kind={choice.category} waste={isWaste} />
              </span>
              <span>
                <span className="block font-semibold text-slate-900 dark:text-slate-100">{description.trim()}</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {KIND_LABELS[choice.kind]} · {choice.label}
                  {isWaste && ` · ${units(count)}`}
                  {battery && asksBattery(choice.category) && ` · ${BATTERY_LABELS[battery]}`}
                  {screen.trim() && asksScreen(choice.kind, choice.category) && ` · tela de ${screen.trim()} polegadas`}
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
            {step === 'confirm' ? (saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar') : 'Continuar'}
          </button>
        </div>
      </form>
    </div>
  )
}
