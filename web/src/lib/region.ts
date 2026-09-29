import type { Area } from '../api/points'

// For now the map covers only the state of São Paulo.

/** Rectangle containing the state of São Paulo (from OpenStreetMap), in degrees. */
export const REGION_BOUNDS: Area = {
  minLng: -53.109,
  minLat: -25.4896,
  maxLng: -44.1614,
  maxLat: -19.7823,
}

/** Av. Águia de Haia, 2983 - São Paulo/SP. The map opens here and shows it with its own marker. */
export const FATEC_ZONA_LESTE = {
  name: 'Fatec Zona Leste',
  latitude: -23.5213425,
  longitude: -46.4760113,
}
