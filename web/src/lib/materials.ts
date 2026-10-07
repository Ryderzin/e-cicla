import type { Material, SourceType } from '../api/points'

export const MATERIAL_LABELS: Record<Material, string> = {
  BATTERIES: 'Pilhas e baterias',
  COMPUTERS: 'Computadores',
  MOBILE_PHONES: 'Celulares',
  ELECTRICAL_ITEMS: 'Aparelhos elétricos e eletrônicos',
  SMALL_APPLIANCES: 'Eletrodomésticos pequenos',
}

export const UNNAMED_POINT = 'Ponto de coleta'

/** Every material, in the order shown in forms and filters. */
export const MATERIALS = Object.keys(MATERIAL_LABELS) as Material[]

export const SOURCE_LABELS: Record<SourceType, string> = {
  OSM: 'OpenStreetMap',
  MANUAL: 'Equipe E-Cicla',
}
