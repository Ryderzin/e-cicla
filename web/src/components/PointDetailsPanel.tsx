import { useEffect, useRef, useState } from 'react'

import { fetchPoint, type PointDetails, type PointSummary } from '../api/points.ts'
import { directionsUrl } from '../lib/directions.ts'
import { MATERIAL_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { parseOpeningHours } from '../lib/openingHours.ts'
import { CloseIcon, RouteIcon } from './icons.tsx'

type DetailsState = { status: 'loading' } | { status: 'error' } | { status: 'success'; details: PointDetails }

interface PointDetailsPanelProps {
  point: PointSummary
  onClose: () => void
}

/**
 * Details of the selected point: a side panel on desktop and a bottom sheet on phones.
 * Render it with key={point.id} so each point starts with fresh state.
 */
export default function PointDetailsPanel({ point, onClose }: PointDetailsPanelProps) {
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
      aria-labelledby="detalhes-titulo"
      className="absolute inset-x-0 bottom-0 z-[1100] max-h-[65%] overflow-y-auto rounded-t-2xl bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.18)] md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-96 md:rounded-none md:border-l md:border-slate-200 md:shadow-xl"
    >
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pt-2 pb-3">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <h2 id="detalhes-titulo" ref={headingRef} tabIndex={-1} className="pt-1 text-xl font-bold text-slate-900">
            {name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="shrink-0 rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        <section aria-labelledby="materiais-titulo">
          <h3 id="materiais-titulo" className="text-sm font-semibold tracking-wide text-slate-600 uppercase">
            Materiais aceitos
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {point.acceptedMaterials.map((material) => (
              <li key={material} className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-900">
                {MATERIAL_LABELS[material]}
              </li>
            ))}
          </ul>
        </section>

        {state.status === 'loading' && (
          <p role="status" className="text-slate-600">
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

        {state.status === 'success' && <DetailsList details={state.details} />}

        <a
          href={directionsUrl(point.latitude, point.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          <RouteIcon className="size-5" />
          Como chegar
          <span className="sr-only">(abre o aplicativo de mapas ou uma nova aba)</span>
        </a>

        <p className="text-sm text-slate-600">
          As informações podem mudar. Se puder, confirme com o local antes de ir.
          {state.status === 'success' && state.details.sourceType === 'OSM' && (
            <> Dados do OpenStreetMap, um mapa feito de forma colaborativa.</>
          )}
          {state.status === 'success' && state.details.sourceType === 'MANUAL' && (
            <> Dados reunidos pela equipe E-Cicla a partir de fontes oficiais.</>
          )}
        </p>
      </div>
    </aside>
  )
}

function DetailsList({ details }: { details: PointDetails }) {
  return (
    <dl className="space-y-4">
      <div>
        <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">Endereço</dt>
        <dd className="mt-1 text-slate-900">
          {details.address ?? 'Não informado'}
          {details.address && details.addressApproximate && (
            <span className="mt-1 block text-sm text-slate-600">
              Endereço aproximado, calculado pela localização do ponto no mapa.
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">Horário de funcionamento</dt>
        <dd className="mt-1 text-slate-900">
          <OpeningHours value={details.openingHours} />
        </dd>
      </div>
      {details.operator && (
        <div>
          <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">Responsável</dt>
          <dd className="mt-1 text-slate-900">{details.operator}</dd>
        </div>
      )}
      {details.notes && (
        <div>
          <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">Observações</dt>
          <dd className="mt-1 whitespace-pre-line text-slate-900">{details.notes}</dd>
        </div>
      )}
    </dl>
  )
}

function OpeningHours({ value }: { value: string | null }) {
  if (!value) {
    return <>Não informado</>
  }
  const rows = parseOpeningHours(value)
  if (!rows) {
    return <>{value}</>
  }
  return (
    <ul className="space-y-1">
      {rows.map((row, index) => (
        <li key={index}>
          <span className="font-medium">{row.days}:</span> {row.hours}
        </li>
      ))}
    </ul>
  )
}
