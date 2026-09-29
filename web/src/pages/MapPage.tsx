import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { fetchPoints, type PointSummary } from '../api/points.ts'
import PointDetailsPanel from '../components/PointDetailsPanel.tsx'
import PointMap from '../components/PointMap.tsx'
import { REGION_BOUNDS } from '../lib/region.ts'

type PointsState = { status: 'loading' } | { status: 'error' } | { status: 'success'; points: PointSummary[] }

const NO_POINTS: PointSummary[] = []

export default function MapPage() {
  const [state, setState] = useState<PointsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<PointSummary | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchPoints(REGION_BOUNDS, controller.signal)
      .then((points) => setState({ status: 'success', points }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [attempt])

  const closeDetails = useCallback(() => setSelected(null), [])

  const points = state.status === 'success' ? state.points : NO_POINTS

  return (
    <div className="relative min-h-[28rem] flex-1">
      <title>Mapa de pontos de coleta | E-Cicla</title>
      <h1 className="sr-only">Mapa de pontos de coleta</h1>

      <PointMap points={points} selected={selected} onSelect={setSelected} />

      {state.status === 'loading' && (
        <MapMessage role="status">
          <span
            className="size-5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent"
            aria-hidden="true"
          />
          Carregando pontos de coleta…
        </MapMessage>
      )}

      {state.status === 'error' && (
        <MapMessage role="alert">
          <div>
            <p className="font-semibold">Não foi possível carregar os pontos.</p>
            <p className="mt-1 text-slate-600">Verifique sua conexão com a internet e tente de novo.</p>
            <button
              type="button"
              onClick={() => {
                setState({ status: 'loading' })
                setAttempt((value) => value + 1)
              }}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
            >
              Tentar de novo
            </button>
          </div>
        </MapMessage>
      )}

      {state.status === 'success' && points.length === 0 && (
        <MapMessage role="status">
          <div>
            <p className="font-semibold">Ainda não há pontos de coleta no mapa.</p>
            <p className="mt-1 text-slate-600">Estamos reunindo pontos de fontes públicas. Volte em breve.</p>
          </div>
        </MapMessage>
      )}

      {state.status === 'success' && points.length > 0 && (
        <p role="status" className="sr-only">
          {points.length === 1 ? '1 ponto de coleta no mapa.' : `${points.length} pontos de coleta no mapa.`} Use a
          tecla Tab para percorrer os pontos e Enter para ver os detalhes.
        </p>
      )}

      {selected && <PointDetailsPanel key={selected.id} point={selected} onClose={closeDetails} />}
    </div>
  )
}

function MapMessage({ role, children }: { role: 'status' | 'alert'; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-[1050] flex justify-center px-4">
      <div
        role={role}
        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-lg"
      >
        {children}
      </div>
    </div>
  )
}
