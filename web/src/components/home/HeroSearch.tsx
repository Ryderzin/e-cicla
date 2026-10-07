import { type FormEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { LocationError, locateDevice, type NearbyRequest } from '../../lib/geolocation.ts'
import { LocateIcon, SearchIcon } from '../icons.tsx'

type HeroState = { status: 'idle' } | { status: 'locating' } | { status: 'error'; message: string }

/**
 * Search right on the home page: a typed address or the device's location opens the map already
 * showing the nearest points. The search goes to the map in the navigation state, never in the URL.
 */
export default function HeroSearch() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [state, setState] = useState<HeroState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  function openMap(nearbyRequest: NearbyRequest) {
    navigate('/mapa', { state: { nearbyRequest } })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const query = text.trim()
    if (query.length < 3) {
      setState({ status: 'error', message: 'Digite um endereço, bairro ou cidade para buscar.' })
      inputRef.current?.focus()
      return
    }
    openMap({ kind: 'address', text: query })
  }

  async function nearMe() {
    // Asked here, while the click is fresh, so the browser shows its permission question right away.
    setState({ status: 'locating' })
    try {
      const position = await locateDevice()
      openMap({ kind: 'device', ...position })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof LocationError ? error.message : 'Não foi possível descobrir a sua localização.',
      })
    }
  }

  return (
    <div className="mt-8 max-w-xl rounded-2xl bg-white p-4 shadow-lg ring-1 ring-emerald-100 sm:p-5">
      <form role="search" aria-label="Pontos de coleta perto de um local" onSubmit={submit}>
        <label htmlFor="busca-inicio" className="block font-semibold text-slate-900">
          Onde você está?
        </label>
        <div className="mt-2 flex gap-2">
          <input
            ref={inputRef}
            id="busca-inicio"
            type="text"
            enterKeyHint="search"
            autoComplete="street-address"
            placeholder="Endereço, bairro ou cidade"
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-describedby="busca-inicio-situacao"
            className="min-w-0 flex-1 rounded-lg border border-slate-500 px-3 py-3 text-slate-900 placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            <SearchIcon className="size-5" />
            <span className="sr-only sm:not-sr-only">Buscar</span>
          </button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-slate-600">ou</span>
        <button
          type="button"
          onClick={nearMe}
          disabled={state.status === 'locating'}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 px-3 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:border-slate-300 disabled:text-slate-500"
        >
          <LocateIcon className="size-5" />
          Usar minha localização
        </button>
      </div>
      <p id="busca-inicio-situacao" role="status" className="mt-2 text-sm empty:mt-0">
        {state.status === 'locating' && <span className="text-slate-700">Buscando a sua localização…</span>}
        {state.status === 'error' && <span className="font-medium text-red-800">{state.message}</span>}
      </p>
    </div>
  )
}
