import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { fetchPoint, type PointDetails, type PointSummary } from '../api/points.ts'
import { directionsUrl } from '../lib/directions.ts'
import { MATERIAL_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { parseOpeningHours } from '../lib/openingHours.ts'
import { SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'
import { CloseIcon, EditIcon, RouteIcon } from './icons.tsx'
import ReadAloudButton from './ReadAloudButton.tsx'
import { stop } from '../lib/speech.ts'

type DetailsState = { status: 'loading' } | { status: 'error' } | { status: 'success'; details: PointDetails }

interface PointDetailsPanelProps {
  point: PointSummary
  onClose: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Details of the selected point: a side panel on desktop and a bottom sheet on phones.
 * Render it with key={point.id} so each point starts with fresh state.
 */
export default function PointDetailsPanel({ point, onClose }: PointDetailsPanelProps) {
  useEffect(() => {
    return () => {
      stop()
    }
  }, [])
  const [state, setState] = useState<DetailsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchPoint(point.id, controller.signal)
      .then((details) => setState({ status: 'success', details }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [point.id, attempt])

  // Move focus into the panel so keyboard and screen reader users land on the details,
  // and give it back to where it was (usually the marker) when the panel closes.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    headingRef.current?.focus()
    return () => {
      if (previous?.isConnected) {
        previous.focus()
      }
    }
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const name = point.name ?? UNNAMED_POINT

  return (
    <aside
      data-tour="detalhes"
      aria-labelledby="detalhes-titulo"
      className="absolute inset-x-0 bottom-0 z-[1100] max-h-[65%] overflow-y-auto rounded-t-2xl bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.18)] md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-96 md:rounded-none md:border-l md:border-slate-200 md:shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pt-2 pb-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <h2 id="detalhes-titulo" ref={headingRef} tabIndex={-1} className="pt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
            {name}
          </h2>
          <button
            type="button"
            onClick={() => {
              stop()
              onClose()
            }}
            aria-label="Fechar detalhes"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mt-2">
          <ReadAloudButton
            size="sm"
            label="Ouvir detalhes"
            getText={() => buildPointSpeechText(point, state.status === 'success' ? state.details : null)}
          />
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        <section aria-labelledby="materiais-titulo">
          <h3 id="materiais-titulo" className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
            Materiais aceitos
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {point.acceptedMaterials.map((material) => (
              <li key={material} className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                {MATERIAL_LABELS[material]}
              </li>
            ))}
          </ul>
        </section>

        {state.status === 'loading' && (
          <p role="status" className="text-slate-600 dark:text-slate-400">
            Carregando detalhes…
          </p>
        )}

        {state.status === 'error' && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900">
            <p>Não foi possível carregar os detalhes deste ponto.</p>
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
          </div>
        )}

        {state.status === 'success' && <DetailsList details={state.details} pointId={point.id} />}

        <div className="space-y-2.5">
          <a
            href={directionsUrl(point.latitude, point.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            <RouteIcon className="size-5" />
            Como chegar
            <span className="sr-only">(abre o aplicativo de mapas ou uma nova aba)</span>
          </a>

          <Link
            to={`/sugestoes/nova?ponto=${encodeURIComponent(point.id)}`}
            className={`${SECONDARY_BUTTON} w-full`}
          >
            <EditIcon className="size-4" />
            Sugerir correção
          </Link>
        </div>

        <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
          {state.status === 'success' && state.details.verifiedAt && (
            <p className="font-medium text-emerald-900 dark:text-emerald-400">
              Atualizado pela equipe em {formatDate(state.details.verifiedAt)}.
            </p>
          )}
          <p>
            As informações podem mudar. Se puder, confirme com o local antes de ir.
            {state.status === 'success' && state.details.sourceType === 'OSM' && (
              <>
                {' '}
                Dados do OpenStreetMap, um mapa feito de forma colaborativa
                {state.details.editedByTeam ? ', revisados pela equipe E-Cicla.' : '.'}
              </>
            )}
            {state.status === 'success' && state.details.sourceType === 'MANUAL' && (
              <> Dados reunidos pela equipe E-Cicla a partir de fontes oficiais.</>
            )}
            {state.status === 'success' && state.details.sourceType === 'SUGGESTION' && (
              <> Ponto sugerido pela comunidade e verificado pela equipe E-Cicla.</>
            )}
          </p>
        </div>
      </div>
    </aside>
  )
}

function DetailsList({ details, pointId }: { details: PointDetails; pointId: string }) {
  return (
    <dl className="space-y-4">
      <div>
        <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">Endereço</dt>
        <dd className="mt-1 text-slate-900 dark:text-slate-100">
          {details.address ?? 'Não informado'}
          {details.address && details.addressApproximate && (
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
              Endereço aproximado, calculado pela localização do ponto no mapa.
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">Horário de funcionamento</dt>
        <dd className="mt-1 text-slate-900 dark:text-slate-100">
          <OpeningHours value={details.openingHours} pointId={pointId} />
        </dd>
      </div>
      {details.operator && (
        <div>
          <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">Responsável</dt>
          <dd className="mt-1 text-slate-900 dark:text-slate-100">{details.operator}</dd>
        </div>
      )}
      {details.notes && (
        <div>
          <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">Observações</dt>
          <dd className="mt-1 whitespace-pre-line text-slate-900 dark:text-slate-100">{details.notes}</dd>
        </div>
      )}
    </dl>
  )
}

function OpeningHours({ value, pointId }: { value: string | null; pointId: string }) {
  if (!value) {
    return (
      <span className="text-slate-600 dark:text-slate-400">
        Horário não informado. Se você souber,{' '}
        <Link to={`/sugestoes/nova?ponto=${encodeURIComponent(pointId)}`} className={TEXT_LINK}>
          sugira uma correção
        </Link>
        .
      </span>
    )
  }
  const rows = parseOpeningHours(value)
  if (!rows) {
    return <span className="text-slate-900 dark:text-slate-100">{value}</span>
  }
  return (
    <ul className="space-y-1">
      {rows.map((row, index) => (
        <li
          key={index}
          className={`flex flex-wrap items-center gap-1.5 ${
            row.isToday ? 'font-semibold text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          <span>{row.days}:</span>
          <span>{row.hours}</span>
          {row.isToday && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              hoje
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}


function buildPointSpeechText(point: PointSummary, details?: PointDetails | null): string {
  const parts: string[] = []
  parts.push(point.name ?? 'Ponto de coleta.')
  if (details?.address) {
    if (details.addressApproximate) {
      parts.push(`Endereço aproximado: ${details.address}.`)
    } else {
      parts.push(`Endereço: ${details.address}.`)
    }
  }
  const materials = point.acceptedMaterials.map((m) => MATERIAL_LABELS[m]).join(', ')
  parts.push(`Materiais aceitos: ${materials}.`)
  if (details?.openingHours) {
    const rows = parseOpeningHours(details.openingHours)
    if (rows) {
      const schedule = rows.map((r) => `${r.days}: ${r.hours}`).join('. ')
      parts.push(`Horário de funcionamento: ${schedule}.`)
    } else {
      parts.push(`Horário de funcionamento: ${details.openingHours}.`)
    }
  } else {
    parts.push('Horário de funcionamento não informado.')
  }
  if (details?.operator) {
    parts.push(`Responsável: ${details.operator}.`)
  }
  if (details?.notes) {
    parts.push(`Observações: ${details.notes}.`)
  }
  return parts.join(' ')
}
