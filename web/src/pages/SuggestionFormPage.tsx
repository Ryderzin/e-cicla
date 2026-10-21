import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import { POINT_LIMITS, type PointInput } from '../api/admin.ts'
import { isApiError } from '../api/client.ts'
import { fetchPoint, type Material, searchPlace } from '../api/points.ts'
import {
  createSuggestion,
  fetchMySuggestion,
  type ProposedPoint,
  SUGGESTION_LIMITS,
  type SuggestionType,
  updateMySuggestion,
} from '../api/suggestions.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Notice, TextAreaField, TextField } from '../components/forms.tsx'
import { BackIcon, SearchIcon } from '../components/icons.tsx'
import LocationPicker from '../components/LocationPicker.tsx'
import { MATERIAL_LABELS, MATERIALS, UNNAMED_POINT } from '../lib/materials.ts'
import { loginPath } from '../lib/navigation.ts'
import { FATEC_ZONA_LESTE, isInsideRegion, REGION_BOUNDS, roundCoordinate } from '../lib/region.ts'
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
  comment: string
}

type Field = 'latitude' | 'acceptedMaterials' | 'comment'
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
  comment: '',
}

function fromProposed(proposed: ProposedPoint, comment: string | null): FormValues {
  return {
    name: proposed.name ?? '',
    latitude: String(proposed.latitude),
    longitude: String(proposed.longitude),
    address: proposed.address ?? '',
    acceptedMaterials: proposed.acceptedMaterials,
    openingHours: proposed.openingHours ?? '',
    operator: proposed.operator ?? '',
    notes: proposed.notes ?? '',
    comment: comment ?? '',
  }
}

function parseCoordinate(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || Number.isNaN(value) ? null : value
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; type: SuggestionType; pointId: string | null; targetName: string | null }

export default function SuggestionFormPage() {
  const { status: authStatus } = useAuth()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const pointParam = searchParams.get('ponto')
  const isEditing = id !== undefined
  const location = useLocation()
  const navigate = useNavigate()

  const [load, setLoad] = useState<LoadState>(
    !isEditing && !pointParam
      ? { status: 'ready', type: 'NEW_POINT', pointId: null, targetName: null }
      : { status: 'loading' },
  )
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [searchingAddress, setSearchingAddress] = useState(false)
  const [addressNotice, setAddressNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [recenterKey, setRecenterKey] = useState(0)
  const lastSearchedAddress = useRef<string | null>(null)

  const addressInputRef = useRef<HTMLInputElement>(null)
  const materialsRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (authStatus !== 'signed-in') {
      return
    }
    if (!isEditing && !pointParam) {
      return
    }
    const controller = new AbortController()
    if (isEditing) {
      fetchMySuggestion(id, controller.signal)
        .then((suggestion) => {
          if (suggestion.status !== 'PENDING') {
            setLoad({
              status: 'error',
              message: 'Esta sugestão já foi avaliada pela equipe e não pode mais ser editada.',
            })
            return
          }
          setValues(fromProposed(suggestion.proposed, suggestion.comment))
          lastSearchedAddress.current = suggestion.proposed.address ?? null
          setLoad({
            status: 'ready',
            type: suggestion.type,
            pointId: suggestion.pointId,
            targetName: suggestion.currentPointName,
          })
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoad({ status: 'error', message: 'Não foi possível carregar esta sugestão.' })
          }
        })
    } else if (pointParam) {
      fetchPoint(pointParam, controller.signal)
        .then((point) => {
          setValues({
            name: point.name ?? '',
            latitude: String(point.latitude),
            longitude: String(point.longitude),
            address: point.address ?? '',
            acceptedMaterials: point.acceptedMaterials,
            openingHours: point.openingHours ?? '',
            operator: point.operator ?? '',
            notes: point.notes ?? '',
            comment: '',
          })
          lastSearchedAddress.current = point.address ?? null
          setLoad({
            status: 'ready',
            type: 'POINT_UPDATE',
            pointId: point.id,
            targetName: point.name ?? UNNAMED_POINT,
          })
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoad({ status: 'error', message: 'Não foi possível carregar o ponto de coleta selecionado.' })
          }
        })
    }
    return () => controller.abort()
  }, [authStatus, id, isEditing, pointParam])

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }))

  const placeOnMap = useCallback(
    (latitude: number, longitude: number) => {
      setValues((current) => ({ ...current, latitude: String(latitude), longitude: String(longitude) }))
      setErrors((errs) => {
        if (!errs.latitude) return errs
        const next = { ...errs }
        delete next.latitude
        return next
      })
    },
    [],
  )

  const lookupAddress = useCallback(async (query: string) => {
    const clean = query.trim()
    if (clean.length < 3) {
      setAddressNotice({
        kind: 'error',
        text: 'Informe um endereço mais completo (rua, número ou bairro) para localizar no mapa.',
      })
      return
    }
    setSearchingAddress(true)
    setAddressNotice(null)
    lastSearchedAddress.current = clean
    try {
      const place = await searchPlace(clean, REGION_BOUNDS)
      if (!isInsideRegion(place.latitude, place.longitude)) {
        setAddressNotice({
          kind: 'error',
          text: 'Esse endereço fica fora do estado de São Paulo, a área atendida pela plataforma.',
        })
        return
      }
      const lat = roundCoordinate(place.latitude)
      const lng = roundCoordinate(place.longitude)
      setValues((current) => ({
        ...current,
        latitude: String(lat),
        longitude: String(lng),
      }))
      setRecenterKey((k) => k + 1)
      setErrors((errs) => {
        if (!errs.latitude) return errs
        const next = { ...errs }
        delete next.latitude
        return next
      })
      setAddressNotice({
        kind: 'success',
        text: `Endereço localizado no mapa: ${place.label ?? clean}. Arraste o marcador se quiser refinar a entrada exata.`,
      })
    } catch (caught) {
      if (isApiError(caught, 404)) {
        setAddressNotice({
          kind: 'error',
          text: 'Endereço não encontrado no estado de SP. Tente incluir o número ou a cidade (ex.: “Av. Paulista, 1000, São Paulo”) ou marque direto no mapa.',
        })
      } else if (isApiError(caught, 503)) {
        setAddressNotice({
          kind: 'error',
          text: 'Muitas consultas no momento. Aguarde alguns segundos e tente novamente.',
        })
      } else {
        setAddressNotice({
          kind: 'error',
          text: 'Não foi possível buscar o endereço agora. Você também pode marcar clicando no mapa.',
        })
      }
    } finally {
      setSearchingAddress(false)
    }
  }, [])

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
    return <Navigate to={loginPath(location.pathname + location.search)} replace />
  }

  function toggleMaterial(material: Material, checked: boolean) {
    set(
      'acceptedMaterials',
      checked
        ? MATERIALS.filter((m) => m === material || values.acceptedMaterials.includes(m))
        : values.acceptedMaterials.filter((m) => m !== material),
    )
  }

  function validate(): { errors: Errors; proposed: PointInput | null } {
    const found: Errors = {}
    const latitude = parseCoordinate(values.latitude)
    const longitude = parseCoordinate(values.longitude)
    if (latitude === null || longitude === null) {
      found.latitude = 'Informe o endereço e localize no mapa, ou clique no mapa para marcar o local do ponto.'
    } else if (!isInsideRegion(latitude, longitude)) {
      found.latitude = 'O local precisa ficar no estado de São Paulo, a área atendida pela plataforma.'
    }
    if (values.acceptedMaterials.length === 0) {
      found.acceptedMaterials = 'Escolha pelo menos um material aceito.'
    }
    if (values.comment.trim().length > SUGGESTION_LIMITS.comment) {
      found.comment = `O comentário pode ter no máximo ${SUGGESTION_LIMITS.comment} caracteres.`
    }
    if (Object.keys(found).length > 0 || latitude === null || longitude === null) {
      return { errors: found, proposed: null }
    }
    return {
      errors: found,
      proposed: {
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
    if (load.status !== 'ready') {
      return
    }
    const { errors: found, proposed } = validate()
    setErrors(found)
    setFormError(null)
    if (!proposed) {
      if (found.acceptedMaterials) {
        materialsRef.current?.querySelector('input')?.focus()
      } else if (found.latitude) {
        addressInputRef.current?.focus()
      }
      return
    }
    setSaving(true)
    try {
      const payload = {
        type: load.type,
        pointId: load.pointId,
        proposed,
        comment: values.comment,
      }
      if (isEditing && id) {
        await updateMySuggestion(id, payload)
        navigate('/sugestoes', {
          state: { message: 'As alterações na sua sugestão foram salvas.' },
        })
      } else {
        await createSuggestion(payload)
        navigate('/sugestoes', {
          state: {
            message:
              load.type === 'NEW_POINT'
                ? 'Sua sugestão de novo ponto foi enviada e será analisada pela equipe.'
                : 'Sua sugestão de correção foi enviada e será analisada pela equipe.',
          },
        })
      }
    } catch (caught) {
      setSaving(false)
      setFormError(
        isApiError(caught, 409)
          ? 'Esta sugestão já foi avaliada pela equipe e não pode mais ser alterada.'
          : isApiError(caught, 400)
            ? 'Confira os dados informados e tente de novo.'
            : 'Não foi possível enviar sua sugestão agora. Verifique sua conexão e tente de novo.',
      )
    }
  }

  const pageTitle = isEditing
    ? 'Editar sugestão'
    : load.status === 'ready' && load.type === 'POINT_UPDATE'
      ? `Sugerir correção${load.targetName ? ` em “${load.targetName}”` : ''}`
      : 'Sugerir novo ponto de coleta'

  const latitude = parseCoordinate(values.latitude)
  const longitude = parseCoordinate(values.longitude)

  return (
    <div className={PAGE}>
      <title>{`${pageTitle} | E-Cicla`}</title>
      <Link to="/sugestoes" className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950">
        <BackIcon className="size-5" />
        Minhas sugestões
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">{pageTitle}</h1>
      <p className="mt-1 text-lg text-slate-700">
        {load.status === 'ready' && load.type === 'POINT_UPDATE'
          ? 'Altere apenas os campos que precisam de correção. A equipe do E-Cicla vai conferir antes de atualizar o mapa.'
          : 'Informe os dados do ponto de coleta. Um administrador vai conferir as informações antes de publicá-lo no mapa.'}
      </p>

      {load.status === 'loading' && (
        <p role="status" className="mt-6 text-slate-700">
          Carregando informações…
        </p>
      )}

      {load.status === 'error' && (
        <div className="mt-6">
          <Notice kind="error">
            {load.message}{' '}
            <Link to="/sugestoes" className={TEXT_LINK}>
              Voltar para minhas sugestões
            </Link>
          </Notice>
        </div>
      )}

      {load.status === 'ready' && (
        <form onSubmit={submit} noValidate className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            {formError && <Notice kind="error">{formError}</Notice>}

            <TextField
              label="Nome do local"
              hint="Ex.: Ecoponto Parque Guarani, Supermercado Exemplo."
              maxLength={POINT_LIMITS.name}
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
            />

            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <TextField
                    ref={addressInputRef}
                    label="Endereço"
                    hint="Rua, número - Bairro, Cidade - SP"
                    autoComplete="off"
                    maxLength={POINT_LIMITS.address}
                    value={values.address}
                    onChange={(event) => {
                      set('address', event.target.value)
                      setAddressNotice(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void lookupAddress(values.address)
                      }
                    }}
                    onBlur={() => {
                      if (
                        values.address.trim().length >= 5 &&
                        values.address.trim() !== lastSearchedAddress.current
                      ) {
                        void lookupAddress(values.address)
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void lookupAddress(values.address)}
                  disabled={searchingAddress || !values.address.trim()}
                  className="inline-flex h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Localizar este endereço no mapa"
                >
                  <SearchIcon className="size-4 text-slate-600" />
                  {searchingAddress ? 'Buscando…' : 'Localizar no mapa'}
                </button>
              </div>
              {addressNotice && (
                <p
                  className={`mt-1.5 text-sm font-medium ${
                    addressNotice.kind === 'error' ? 'text-red-800' : 'text-emerald-800'
                  }`}
                >
                  {addressNotice.text}
                </p>
              )}
            </div>

            <fieldset ref={materialsRef} aria-describedby={errors.acceptedMaterials ? 'materiais-erro' : undefined}>
              <legend className="font-semibold text-slate-900">Materiais aceitos (obrigatório)</legend>
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
              hint="Ex.: Segunda a sábado, das 8h às 17h."
              maxLength={POINT_LIMITS.openingHours}
              value={values.openingHours}
              onChange={(event) => set('openingHours', event.target.value)}
            />

            <TextField
              label="Responsável pelo ponto"
              hint="Quem mantém o ponto, como a prefeitura, cooperativa ou loja."
              maxLength={POINT_LIMITS.operator}
              value={values.operator}
              onChange={(event) => set('operator', event.target.value)}
            />

            <TextAreaField
              label="Observações ou restrições"
              hint="Avisos importantes, como “não recebe geladeiras ou TVs de tubo”."
              maxLength={POINT_LIMITS.notes}
              value={values.notes}
              onChange={(event) => set('notes', event.target.value)}
            />

            <TextAreaField
              label="Como você conheceu ou conferiu este ponto? (opcional)"
              hint="Ajuda a equipe na verificação, por exemplo: “Vi o coletor na entrada da loja” ou “Site oficial da prefeitura”."
              maxLength={SUGGESTION_LIMITS.comment}
              value={values.comment}
              onChange={(event) => set('comment', event.target.value)}
              error={errors.comment}
            />
          </div>

          <div className="space-y-4">
            <fieldset aria-describedby={errors.latitude ? 'localizacao-erro' : undefined}>
              <legend className="font-semibold text-slate-900">Localização no mapa (obrigatório)</legend>
              <p className="mt-0.5 text-sm text-slate-600">
                O mapa se posiciona automaticamente pelo endereço. Você também pode clicar no mapa ou arrastar o
                marcador para ajustar a entrada ou coletor.
              </p>
              <div className="mt-3">
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={placeOnMap}
                  fallback={FATEC_ZONA_LESTE}
                  recenterKey={recenterKey}
                />
              </div>
              {latitude !== null && longitude !== null ? (
                <p className="mt-2 text-sm font-medium text-emerald-800">
                  Local marcado no mapa. Arraste o marcador se quiser posicionar a entrada exata.
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Nenhum local marcado ainda. Digite o endereço e clique em “Localizar no mapa” ou clique diretamente no mapa.
                </p>
              )}
              {errors.latitude && (
                <p id="localizacao-erro" className="mt-1 text-sm font-medium text-red-800">
                  {errors.latitude}
                </p>
              )}
            </fieldset>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>
                {saving ? 'Enviando…' : isEditing ? 'Salvar alterações' : 'Enviar sugestão'}
              </button>
              <Link to="/sugestoes" className={SECONDARY_BUTTON}>
                Cancelar
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
