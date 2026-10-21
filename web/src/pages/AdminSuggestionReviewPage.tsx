import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { POINT_LIMITS, type PointInput } from '../api/admin.ts'
import { isApiError } from '../api/client.ts'
import type { Material } from '../api/points.ts'
import {
  type AdminSuggestionDetail,
  approveSuggestion,
  fetchAdminSuggestion,
  type ProposedPoint,
  rejectSuggestion,
  SUGGESTION_LIMITS,
} from '../api/suggestions.ts'
import AdminNav from '../components/AdminNav.tsx'
import { Notice, TextAreaField, TextField } from '../components/forms.tsx'
import { BackIcon } from '../components/icons.tsx'
import LocationPicker from '../components/LocationPicker.tsx'
import { MATERIAL_LABELS, MATERIALS, UNNAMED_POINT } from '../lib/materials.ts'
import { FATEC_ZONA_LESTE, isInsideRegion } from '../lib/region.ts'
import { DANGER_BUTTON, PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

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

type Field = 'latitude' | 'acceptedMaterials'
type Errors = Partial<Record<Field, string>>

function fromProposed(proposed: ProposedPoint): FormValues {
  return {
    name: proposed.name ?? '',
    latitude: String(proposed.latitude),
    longitude: String(proposed.longitude),
    address: proposed.address ?? '',
    acceptedMaterials: proposed.acceptedMaterials,
    openingHours: proposed.openingHours ?? '',
    operator: proposed.operator ?? '',
    notes: proposed.notes ?? '',
  }
}

function parseCoordinate(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || Number.isNaN(value) ? null : value
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; detail: AdminSuggestionDetail }

type ConfirmMode = 'approve' | 'reject' | null

export default function AdminSuggestionReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [values, setValues] = useState<FormValues>({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    acceptedMaterials: [],
    openingHours: '',
    operator: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const latitudeRef = useRef<HTMLInputElement>(null)
  const materialsRef = useRef<HTMLFieldSetElement>(null)
  const rejectReasonRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!id) {
      return
    }
    const controller = new AbortController()
    fetchAdminSuggestion(id, controller.signal)
      .then((detail) => {
        setValues(fromProposed(detail.suggestion.proposed))
        setLoad({ status: 'ready', detail })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoad({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (confirmMode === 'reject') {
      rejectReasonRef.current?.focus()
    }
  }, [confirmMode])

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

  function validateProposed(): { errors: Errors; proposed: PointInput | null } {
    const found: Errors = {}
    const latitude = parseCoordinate(values.latitude)
    const longitude = parseCoordinate(values.longitude)
    if (latitude === null || longitude === null) {
      found.latitude = 'Marque o local no mapa ou informe a latitude e a longitude.'
    } else if (!isInsideRegion(latitude, longitude)) {
      found.latitude = 'O local precisa ficar no estado de São Paulo.'
    }
    if (values.acceptedMaterials.length === 0) {
      found.acceptedMaterials = 'Escolha pelo menos um material aceito.'
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

  function startApprove() {
    const { errors: found, proposed } = validateProposed()
    setErrors(found)
    setFormError(null)
    if (!proposed) {
      ;(found.latitude ? latitudeRef.current : materialsRef.current?.querySelector('input'))?.focus()
      return
    }
    setConfirmMode('approve')
  }

  async function confirmApprove() {
    if (!id || load.status !== 'ready') {
      return
    }
    const { proposed } = validateProposed()
    if (!proposed) {
      setConfirmMode(null)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const approved = await approveSuggestion(id, proposed)
      const name = approved.proposed.name ?? UNNAMED_POINT
      navigate('/admin/sugestoes', {
        state: {
          message:
            approved.type === 'NEW_POINT'
              ? `A sugestão “${name}” foi aprovada e o novo ponto já está no mapa.`
              : `A correção para “${name}” foi aprovada e atualizada no mapa.`,
        },
      })
    } catch (caught) {
      setSaving(false)
      setConfirmMode(null)
      setFormError(
        isApiError(caught, 409)
          ? 'Esta sugestão já foi avaliada.'
          : 'Não foi possível aprovar a sugestão agora. Tente de novo.',
      )
    }
  }

  async function confirmReject(event: FormEvent) {
    event.preventDefault()
    if (!id) {
      return
    }
    const cleanReason = rejectReason.trim()
    if (!cleanReason) {
      setRejectError('Informe o motivo para que o usuário entenda por que a sugestão não foi aprovada.')
      rejectReasonRef.current?.focus()
      return
    }
    setSaving(true)
    setRejectError(null)
    setFormError(null)
    try {
      const rejected = await rejectSuggestion(id, cleanReason)
      const name = rejected.proposed.name ?? rejected.currentPointName ?? UNNAMED_POINT
      navigate('/admin/sugestoes', {
        state: { message: `A sugestão para “${name}” foi marcada como não aprovada.` },
      })
    } catch (caught) {
      setSaving(false)
      setFormError(
        isApiError(caught, 409)
          ? 'Esta sugestão já foi avaliada.'
          : 'Não foi possível registrar a avaliação agora. Tente de novo.',
      )
    }
  }

  const latitude = parseCoordinate(values.latitude)
  const longitude = parseCoordinate(values.longitude)

  return (
    <div className={PAGE}>
      <title>Avaliar sugestão | Administração | E-Cicla</title>
      <AdminNav />

      <Link
        to="/admin/sugestoes"
        className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950"
      >
        <BackIcon className="size-5" />
        Sugestões
      </Link>

      {load.status === 'loading' && (
        <p role="status" className="mt-6 text-slate-700">
          Carregando sugestão…
        </p>
      )}

      {load.status === 'error' && (
        <div className="mt-6">
          <Notice kind="error">
            Não foi possível carregar esta sugestão.{' '}
            <Link to="/admin/sugestoes" className={TEXT_LINK}>
              Voltar para a lista
            </Link>
          </Notice>
        </div>
      )}

      {load.status === 'ready' && (
        <>
          <div className="mt-3">
            <span className="text-sm font-semibold tracking-wide text-emerald-800 uppercase">
              {load.detail.suggestion.type === 'NEW_POINT'
                ? 'Sugestão de novo ponto'
                : 'Sugestão de correção de ponto'}
            </span>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {load.detail.suggestion.proposed.name ?? load.detail.suggestion.currentPointName ?? UNNAMED_POINT}
            </h1>
            <p className="mt-1 text-slate-700">
              Enviada em {formatDate(load.detail.suggestion.createdAt)}
              {load.detail.authorName && (
                <>
                  {' '}
                  por <span className="font-semibold">{load.detail.authorName}</span>
                  {load.detail.authorEmail ? ` (${load.detail.authorEmail})` : ''}
                </>
              )}
              .
            </p>
          </div>

          {load.detail.suggestion.comment && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold tracking-wide text-slate-600 uppercase">
                Comentário do usuário
              </h2>
              <p className="mt-1 text-lg text-slate-900">{load.detail.suggestion.comment}</p>
            </div>
          )}

          {/* PB25: Alerta de pontos duplicados */}
          {load.detail.nearbyDuplicates.length > 0 && (
            <div
              role="region"
              aria-label="Possíveis pontos duplicados"
              className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-slate-900"
            >
              <h2 className="text-lg font-bold text-amber-950">
                Atenção: {load.detail.nearbyDuplicates.length === 1 ? 'há 1 ponto já cadastrado' : `há ${load.detail.nearbyDuplicates.length} pontos já cadastrados`} perto deste local
              </h2>
              <p className="mt-1 text-slate-800">
                Confira se a sugestão não repete um ponto que já está no mapa num raio de 250 metros:
              </p>
              <ul className="mt-3 space-y-2">
                {load.detail.nearbyDuplicates.map((dup) => (
                  <li key={dup.id} className="rounded-lg border border-amber-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{dup.name ?? UNNAMED_POINT}</span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-950">
                        a {dup.distanceMeters} m
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      Materiais: {dup.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')}
                    </p>
                    <Link to={`/admin/pontos/${dup.id}`} className={`mt-1 inline-block text-sm ${TEXT_LINK}`}>
                      Abrir cadastro deste ponto
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {load.detail.suggestion.type === 'POINT_UPDATE' && load.detail.targetPoint && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Dados atuais do ponto no mapa</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-600">Nome atual</dt>
                  <dd className="text-slate-900">{load.detail.targetPoint.name ?? UNNAMED_POINT}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">Endereço atual</dt>
                  <dd className="text-slate-900">{load.detail.targetPoint.address ?? 'Não informado'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">Materiais atuais</dt>
                  <dd className="text-slate-900">
                    {load.detail.targetPoint.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-600">Horário atual</dt>
                  <dd className="text-slate-900">{load.detail.targetPoint.openingHours ?? 'Não informado'}</dd>
                </div>
              </dl>
            </div>
          )}

          {formError && (
            <div className="mt-5">
              <Notice kind="error">{formError}</Notice>
            </div>
          )}

          {load.detail.suggestion.status !== 'PENDING' ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-bold text-slate-900">
                Situação: {load.detail.suggestion.status === 'APPROVED' ? 'Aprovada' : 'Não aprovada'}
              </h2>
              {load.detail.suggestion.reviewedAt && (
                <p className="mt-1 text-slate-700">
                  Avaliada em {formatDate(load.detail.suggestion.reviewedAt)}.
                </p>
              )}
              {load.detail.suggestion.reviewReason && (
                <p className="mt-2 text-slate-800">
                  <span className="font-semibold">Justificativa:</span> {load.detail.suggestion.reviewReason}
                </p>
              )}
              {load.detail.suggestion.pointId && load.detail.suggestion.status === 'APPROVED' && (
                <p className="mt-3">
                  <Link to={`/admin/pontos/${load.detail.suggestion.pointId}`} className={TEXT_LINK}>
                    Ver ponto publicado na administração
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Dados que serão publicados (você pode ajustar antes de aprovar)
                </h2>

                <TextField
                  label="Nome"
                  maxLength={POINT_LIMITS.name}
                  value={values.name}
                  onChange={(event) => set('name', event.target.value)}
                />

                <TextField
                  label="Endereço"
                  maxLength={POINT_LIMITS.address}
                  value={values.address}
                  onChange={(event) => set('address', event.target.value)}
                />

                <fieldset
                  ref={materialsRef}
                  aria-describedby={errors.acceptedMaterials ? 'materiais-erro' : undefined}
                >
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
                  maxLength={POINT_LIMITS.openingHours}
                  value={values.openingHours}
                  onChange={(event) => set('openingHours', event.target.value)}
                />

                <TextField
                  label="Responsável"
                  maxLength={POINT_LIMITS.operator}
                  value={values.operator}
                  onChange={(event) => set('operator', event.target.value)}
                />

                <TextAreaField
                  label="Observações"
                  maxLength={POINT_LIMITS.notes}
                  value={values.notes}
                  onChange={(event) => set('notes', event.target.value)}
                />
              </div>

              <div className="space-y-5">
                <fieldset>
                  <legend className="font-semibold text-slate-900">Localização</legend>
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
                      value={values.latitude}
                      onChange={(event) => set('latitude', event.target.value)}
                      error={errors.latitude}
                    />
                    <TextField
                      label="Longitude"
                      inputMode="decimal"
                      value={values.longitude}
                      onChange={(event) => set('longitude', event.target.value)}
                      aria-invalid={errors.latitude ? true : undefined}
                    />
                  </div>
                </fieldset>

                {confirmMode === null && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button type="button" onClick={startApprove} className={PRIMARY_BUTTON}>
                      Aprovar e publicar no mapa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectError(null)
                        setConfirmMode('reject')
                      }}
                      className={DANGER_BUTTON}
                    >
                      Rejeitar sugestão
                    </button>
                  </div>
                )}

                {confirmMode === 'approve' && (
                  <div
                    role="region"
                    aria-label="Confirmar aprovação"
                    className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950"
                  >
                    <h3 className="text-lg font-bold">Confirmar aprovação da sugestão?</h3>
                    <p className="mt-1">
                      {load.detail.suggestion.type === 'NEW_POINT'
                        ? 'Um novo ponto de coleta ativo será criado no mapa com os dados acima e marcado como verificado pela equipe.'
                        : 'O ponto de coleta existente será atualizado no mapa com os dados acima e a nova data de verificação.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void confirmApprove()}
                        className={PRIMARY_BUTTON}
                      >
                        {saving ? 'Publicando…' : 'Sim, aprovar e publicar'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setConfirmMode(null)}
                        className={SECONDARY_BUTTON}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {confirmMode === 'reject' && (
                  <form
                    onSubmit={confirmReject}
                    noValidate
                    className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-950"
                  >
                    <h3 className="text-lg font-bold">Rejeitar sugestão</h3>
                    <p>
                      Explique de forma simples o motivo para que a pessoa que enviou a sugestão saiba o que aconteceu.
                    </p>
                    <TextAreaField
                      ref={rejectReasonRef}
                      label="Motivo da rejeição (obrigatório)"
                      hint="Ex.: Este ponto já está cadastrado no mapa com outro nome."
                      maxLength={SUGGESTION_LIMITS.reason}
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      error={rejectError}
                      required
                    />
                    <div className="flex flex-wrap gap-3">
                      <button type="submit" disabled={saving} className={DANGER_BUTTON}>
                        {saving ? 'Salvando…' : 'Confirmar rejeição'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          setConfirmMode(null)
                          setRejectError(null)
                        }}
                        className={SECONDARY_BUTTON}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
