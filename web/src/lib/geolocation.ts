import { isInsideRegion } from './region.ts'

export interface Coordinates {
  latitude: number
  longitude: number
}

/** A search for nearby points started outside the map (on the home page), handed to the map page. */
export type NearbyRequest = { kind: 'address'; text: string } | ({ kind: 'device' } & Coordinates)

export const OUTSIDE_REGION = 'Por enquanto, o E-Cicla mostra apenas pontos de coleta do estado de São Paulo.'

/** Failure with a message ready to show to the user. */
export class LocationError extends Error {}

/**
 * Asks the browser for the device's location (it asks the user's permission the first time).
 * Rejects with a {@link LocationError} explaining what happened, also when the place is outside the region.
 */
export function locateDevice(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new LocationError('Este navegador não informa a localização. Busque por um endereço.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isInsideRegion(coords.latitude, coords.longitude)) {
          reject(new LocationError(`Você está fora do estado de São Paulo. ${OUTSIDE_REGION}`))
          return
        }
        resolve({ latitude: coords.latitude, longitude: coords.longitude })
      },
      (error) =>
        reject(
          new LocationError(
            error.code === error.PERMISSION_DENIED
              ? 'O navegador não liberou a sua localização. Libere a permissão nas configurações do navegador ou busque por um endereço.'
              : 'Não foi possível descobrir a sua localização. Tente de novo ou busque por um endereço.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    )
  })
}
