import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  type AdminPoint,
  createPoint,
  fetchAdminPoint,
  POINT_LIMITS,
  type PointInput,
  updatePoint,
} from '../api/admin.ts'
import { isApiError } from '../api/client.ts'
import type { Material } from '../api/points.ts'
import { Notice, TextAreaField, TextField } from '../components/forms.tsx'
import { BackIcon } from '../components/icons.tsx'
import LocationPicker from '../components/LocationPicker.tsx'
import { MATERIAL_LABELS, MATERIALS, SOURCE_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { FATEC_ZONA_LESTE, isInsideRegion } from '../lib/region.ts'
import { PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

interface FormValues {
  name: string
  latitude: string
  longitude: string
  address: string
  acceptedMaterials: Material[]
  openingHours: string
  operator: string
  notes: string
}

type Field = 'latitude' | 'longitude' | 'acceptedMaterials'
type Errors = Partial<Record<Field, string>>

const EMPTY: FormValues = {
  name: '',
  latitude: '',
  longitude: '',
  address: '',
  acceptedMaterials: [],
  openingHours: '',
  operator: '',
  notes: '',
}

function toForm(point: AdminPoint): FormValues {
  return {
    name: point.name ?? '',
    latitude: String(point.latitude),
    longitude: String(point.longitude),
    address: point.address ?? '',
    acceptedMaterials: point.acceptedMaterials,
    openingHours: point.openingHours ?? '',
    operator: point.operator ?? '',
    notes: point.notes ?? '',
  }
}

/** Accepts "-23,52" (Brazilian decimal comma) as well as "-23.52". */
function parseCoordinate(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || Number.isNaN(value) ? null : value
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; point: AdminPoint | null }

export default function AdminPointFormPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const navigate = useNavigate()
  const [load, setLoad] = useState<LoadState>(isNew ? { status: 'ready', point: null } : { status: 'loading' })
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const latitudeRef = useRef<HTMLInputElement>(null)
  const longitudeRef = useRef<HTMLInputElement>(null)
  const materialsRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (isNew) {
      return
    }
    const controller = new AbortController()
    fetchAdminPoint(id, controller.signal)
      .then((point) => {
        setValues(toForm(point))
        setLoad({ status: 'ready', point })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoad({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [id, isNew])

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }))

  const placeOnMap = useCallback(
    (latitude: number, longitude: number) =>
      setValues((current) => ({ ...current, latitude: String(latitude), longitude: String(longitude) })),
    [],
  )

  function toggleMaterial(material: Material, checked: boolean) {
    set(
      'acceptedMaterials',
      checked
        ? MATERIALS.filter((m) => m === material || values.acceptedMaterials.includes(m))
        : values.acceptedMaterials.filter((m) => m !== material),
    )
  }

  function validate(): { errors: Errors; input: PointInput | null } {
    const found: Errors = {}
    const latitude = parseCoordinate(values.latitude)
    const longitude = parseCoordinate(values.longitude)
    if (latitude === null || longitude === null) {
      found.latitude = 'Marque o local no mapa ou informe a latitude e a longitude.'
    } else if (!isInsideRegion(latitude, longitude)) {
      found.latitude = 'O local precisa ficar no estado de São Paulo, a área que o mapa mostra.'
    }
    if (values.acceptedMaterials.length === 0) {
      found.acceptedMaterials = 'Escolha pelo menos um material aceito.'
    }
    if (Object.keys(found).length > 0 || latitude === null || longitude === null) {
      return { errors: found, input: null }
    }
    return {
      errors: found,
      input: {
        name: values.name,
        latitude,
        longitude,
        address: values.address,
        acceptedMaterials: values.acceptedMaterials,
        openingHours: values.openingHours,
        operator: values.operator,
        notes: values.notes,
      },
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { errors: found, input } = validate()
    setErrors(found)
    setFormError(null)
    if (!input) {
      ;(found.latitude ? latitudeRef.current : materialsRef.current?.querySelector('input'))?.focus()
      return
    }
    setSaving(true)
    try {
      const saved = isNew ? await createPoint(input) : await updatePoint(id, input)
      const name = saved.name ?? UNNAMED_POINT
      navigate('/admin/pontos', {
        state: { message: isNew ? `“${name}” foi cadastrado e já aparece no mapa.` : `As alterações em “${name}” foram salvas.` },
      })
    } catch (caught) {
      setSaving(false)
      setFormError(
        isApiError(caught, 400)
          ? 'Confira os dados informados e tente de novo.'
          : 'Não foi possível salvar agora. Verifique sua conexão e tente de novo.',
      )
    }
  }

  const title = isNew ? 'Cadastrar ponto de coleta' : 'Editar ponto de coleta'
  const latitude = parseCoordinate(values.latitude)
  const longitude = parseCoordinate(values.longitude)

  return (
    <div className={PAGE}>
      <title>{`${title} | Administração | E-Cicla`}</title>
      <Link to="/admin/pontos" className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950">
        <BackIcon className="size-5" />
        Pontos de coleta
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>

      {load.status === 'loading' && (
        <p role="status" className="mt-6 text-slate-700">
          Carregando o ponto…
        </p>
      )}
      {load.status === 'error' && (
        <div className="mt-6">
          <Notice kind="error">
            Não foi possível carregar este ponto.{' '}
            <Link to="/admin/pontos" className={TEXT_LINK}>
              Voltar para a lista
            </Link>
          </Notice>
        </div>
      )}

      {load.status === 'ready' && (
        <form onSubmit={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            {formError && <Notice kind="error">{formError}</Notice>}
            {load.point && (
              <Notice kind="info">
                Origem: {load.point.sourceType ? SOURCE_LABELS[load.point.sourceType] : 'não informada'}.
                {load.point.sourceType === 'OSM' &&
                  ' As alterações feitas aqui continuam valendo quando os pontos públicos forem atualizados.'}
              </Notice>
            )}
            <TextField
              label="Nome"
              hint={`Se ficar em branco, o mapa mostra “${UNNAMED_POINT}”.`}
              maxLength={POINT_LIMITS.name}
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
            />
            <TextField
              label="Endereço"
              hint="Rua, número - Bairro, Cidade - UF"
              autoComplete="off"
              maxLength={POINT_LIMITS.address}
              value={values.address}
              onChange={(event) => set('address', event.target.value)}
            />
            {load.point?.addressApproximate && values.address === load.point.address && (
              <p className="-mt-3 text-sm text-slate-600">
                Este endereço é aproximado, calculado pela localização. Ao corrigi-lo, ele passa a ser exibido como exato.
              </p>
            )}
            <fieldset ref={materialsRef} aria-describedby={errors.acceptedMaterials ? 'materiais-erro' : undefined}>
              <legend className="font-semibold text-slate-900">Materiais aceitos</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {MATERIALS.map((material) => (
                  <label key={material} className="flex items-center gap-2 text-slate-800">
                    <input
                      type="checkbox"
                      checked={values.acceptedMaterials.includes(material)}
                      onChange={(event) => toggleMaterial(material, event.target.checked)}
                      className="size-5 accent-emerald-700"
                    />
                    {MATERIAL_LABELS[material]}
                  </label>
                ))}
              </div>
              {errors.acceptedMaterials && (
                <p id="materiais-erro" className="mt-1 text-sm font-medium text-red-800">
                  {errors.acceptedMaterials}
                </p>
              )}
            </fieldset>
            <TextField
              label="Horário de funcionamento"
              hint="Pode ser como no OpenStreetMap (“Mo-Fr 08:00-17:00”), que o site mostra em português, ou texto livre."
              maxLength={POINT_LIMITS.openingHours}
              value={values.openingHours}
              onChange={(event) => set('openingHours', event.target.value)}
            />
            <TextField
              label="Responsável"
              hint="Quem mantém o ponto, como a prefeitura ou uma loja."
              maxLength={POINT_LIMITS.operator}
              value={values.operator}
              onChange={(event) => set('operator', event.target.value)}
            />
            <TextAreaField
              label="Observações"
              hint="Restrições ou avisos, como “não recebe geladeiras”."
              maxLength={POINT_LIMITS.notes}
              value={values.notes}
              onChange={(event) => set('notes', event.target.value)}
            />
          </div>

          <div className="space-y-4">
            <fieldset>
              <legend className="font-semibold text-slate-900">Localização</legend>
              <p className="mt-0.5 text-sm text-slate-600">
                Clique no mapa para marcar o local ou arraste o marcador. Também é possível digitar as coordenadas.
              </p>
              <div className="mt-2">
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={placeOnMap}
                  fallback={FATEC_ZONA_LESTE}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  ref={latitudeRef}
                  label="Latitude"
                  inputMode="decimal"
                  placeholder="-23.52"
                  value={values.latitude}
                  onChange={(event) => set('latitude', event.target.value)}
                  error={errors.latitude}
                />
                <TextField
                  ref={longitudeRef}
                  label="Longitude"
                  inputMode="decimal"
                  placeholder="-46.47"
                  value={values.longitude}
                  onChange={(event) => set('longitude', event.target.value)}
                  aria-invalid={errors.latitude ? true : undefined}
                />
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <Link to="/admin/pontos" className={SECONDARY_BUTTON}>
                Cancelar
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
