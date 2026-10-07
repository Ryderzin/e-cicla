import { type FormEvent, useEffect, useRef, useState } from 'react'

import { isApiError } from '../api/client.ts'
import { fetchNearbyPoints, type NearbyPoint, type PointSummary, searchPlace } from '../api/points.ts'
import { MATERIAL_LABELS, UNNAMED_POINT } from '../lib/materials.ts'
import { isInsideRegion, REGION_BOUNDS } from '../lib/region.ts'
import { formatDistance } from '../lib/text.ts'
import { CloseIcon, LocateIcon, SearchIcon } from './icons.tsx'

export interface NearbyResults {
  origin: { latitude: number; longitude: number }
  /** How the origin is described: "você" for the device's location, or the address found. */
  originLabel: string
  fromDevice: boolean
  points: NearbyPoint[]
}

type SearchState = { status: 'idle' } | { status: 'working'; message: string } | { status: 'error'; message: string }

interface NearbySearchProps {
  results: NearbyResults | null
  onResults: (results: NearbyResults | null) => void
  selected: PointSummary | null
  onSelect: (point: PointSummary) => void
}

const OUTSIDE_REGION = 'Por enquanto, o E-Cicla mostra apenas pontos de coleta do estado de São Paulo.'

function geolocationMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'O navegador não liberou a sua localização. Libere a permissão nas configurações do navegador ou busque por um endereço.'
  }
  return 'Não foi possível descobrir a sua localização. Tente de novo ou busque por um endereço.'
}

/** Search box over the map: nearest points to the user's location or to a typed address. */
export default function NearbySearch({ results, onResults, selected, onSelect }: NearbySearchProps) {
  const [text, setText] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => controller.current?.abort(), [])

  function start(message: string): AbortSignal {
    controller.current?.abort()
    controller.current = new AbortController()
    setState({ status: 'working', message })
    return controller.current.signal
  }

  async function findNearby(
    signal: AbortSignal,
    origin: { latitude: number; longitude: number },
    originLabel: string,
    fromDevice: boolean,
  ) {
    const points = await fetchNearbyPoints(origin.latitude, origin.longitude, REGION_BOUNDS, signal)
    if (!signal.aborted) {
      setState({ status: 'idle' })
      onResults({ origin, originLabel, fromDevice, points })
    }
  }

  function fail(signal: AbortSignal, message: string) {
    if (!signal.aborted) {
      setState({ status: 'error', message })
    }
  }

  async function searchAddress(event: FormEvent) {
    event.preventDefault()
    const query = text.trim()
    if (query.length < 3) {
      setState({ status: 'error', message: 'Digite um endereço, bairro ou cidade para buscar.' })
      inputRef.current?.focus()
      return
    }
    const signal = start('Buscando o endereço…')
    try {
      const place = await searchPlace(query, REGION_BOUNDS, signal)
      if (!isInsideRegion(place.latitude, place.longitude)) {
        fail(signal, `Esse endereço fica fora do estado de São Paulo. ${OUTSIDE_REGION}`)
        return
      }
      await findNearby(signal, place, place.label ?? query, false)
    } catch (error) {
      if (isApiError(error, 404)) {
        fail(signal, 'Não encontramos esse endereço no estado de São Paulo. Confira o texto ou inclua a cidade, como em “Rua Exemplo, 100, Campinas”.')
      } else if (isApiError(error, 503)) {
        fail(signal, 'Muitas buscas ao mesmo tempo. Aguarde alguns segundos e tente de novo.')
      } else {
        fail(signal, 'Não foi possível buscar agora. Verifique sua conexão e tente de novo.')
      }
    }
  }

  function searchNearMe() {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'Este navegador não informa a localização. Busque por um endereço.' })
      return
    }
    const signal = start('Buscando a sua localização…')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (signal.aborted) {
          return
        }
        const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude }
        if (!isInsideRegion(origin.latitude, origin.longitude)) {
          fail(signal, `Você está fora do estado de São Paulo. ${OUTSIDE_REGION}`)
          return
        }
        setState({ status: 'working', message: 'Procurando os pontos mais perto de você…' })
        try {
          await findNearby(signal, origin, 'você', true)
        } catch {
          fail(signal, 'Não foi possível buscar os pontos agora. Verifique sua conexão e tente de novo.')
        }
      },
      (error) => fail(signal, geolocationMessage(error)),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    )
  }

  function clear() {
    controller.current?.abort()
    setState({ status: 'idle' })
    onResults(null)
    inputRef.current?.focus()
  }

  const working = state.status === 'working'

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-[1050] md:right-auto md:w-[23rem]">
      <div className="pointer-events-auto rounded-xl bg-white p-2 shadow-lg">
        <form role="search" aria-label="Pontos perto de um local" onSubmit={searchAddress} className="flex items-center gap-1.5">
          <label htmlFor="busca-endereco" className="sr-only">
            Endereço, bairro ou cidade
          </label>
          <input
            ref={inputRef}
            id="busca-endereco"
            type="text"
            enterKeyHint="search"
            autoComplete="street-address"
            placeholder="Endereço, bairro ou cidade"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-500 px-3 py-2 text-slate-900 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={working}
            className="rounded-lg bg-emerald-700 p-2.5 text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-600"
          >
            <SearchIcon className="size-5" />
            <span className="sr-only">Buscar pontos perto deste endereço</span>
          </button>
          <button
            type="button"
            onClick={searchNearMe}
            disabled={working}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-700 px-2.5 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:border-slate-300 disabled:text-slate-500"
          >
            <LocateIcon className="size-5" />
            <span className="sr-only md:not-sr-only">Perto de mim</span>
          </button>
        </form>

        <div role="status" className={state.status === 'idle' ? 'sr-only' : 'px-1 pt-2 text-sm'}>
          {state.status === 'working' && <p className="text-slate-700">{state.message}</p>}
          {state.status === 'error' && <p className="font-medium text-red-800">{state.message}</p>}
          {state.status === 'idle' && results && (
            <>
              {results.points.length === 1 ? '1 ponto encontrado' : `${results.points.length} pontos encontrados`} perto
              de {results.fromDevice ? 'você' : results.originLabel}.
            </>
          )}
        </div>

        {results && state.status !== 'working' && (
          // On phones the list gives way to the details panel while a point is open.
          <section aria-labelledby="perto-titulo" className={`${selected ? 'hidden md:block' : ''} mt-2 border-t border-slate-200 pt-2`}>
            <div className="flex items-start justify-between gap-2 px-1">
              <h2 id="perto-titulo" className="text-sm font-semibold text-slate-800">
                {results.fromDevice ? 'Mais perto de você' : `Mais perto de ${results.originLabel}`}
              </h2>
              <button
                type="button"
                onClick={clear}
                className="-mt-1 shrink-0 rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <CloseIcon className="size-5" />
                <span className="sr-only">Limpar a busca</span>
              </button>
            </div>
            {results.points.length === 0 ? (
              <p className="px-1 py-2 text-slate-700">Não encontramos pontos de coleta perto deste local.</p>
            ) : (
              <ol className="mt-1 max-h-[32vh] space-y-1 overflow-y-auto md:max-h-[50vh]">
                {results.points.map((point) => (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(point)}
                      aria-current={selected?.id === point.id ? 'true' : undefined}
                      className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-100 aria-[current=true]:bg-amber-50 aria-[current=true]:ring-1 aria-[current=true]:ring-amber-700"
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-slate-900">{point.name ?? UNNAMED_POINT}</span>
                        <span className="shrink-0 text-sm font-medium text-slate-700">
                          {formatDistance(point.distanceMeters)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">
                        {point.acceptedMaterials.map((material) => MATERIAL_LABELS[material]).join(', ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <p className="px-1 pt-1 text-xs text-slate-600">Distância em linha reta.</p>
          </section>
        )}
      </div>
    </div>
  )
}
