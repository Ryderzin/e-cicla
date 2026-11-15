import type { BatteryType, ItemKind } from '../api/devices'
import type { Material } from '../api/points'

export interface ItemOption {
  kind: ItemKind
  category: Material
  label: string
  hint: string
  /** Suggested name for loose waste, which people rarely name one by one. */
  defaultName?: string
}

/** Whole devices: registered one by one, with a name (PB09). */
export const DEVICE_OPTIONS: ItemOption[] = [
  { kind: 'DEVICE', category: 'MOBILE_PHONES', label: 'Celular ou tablet', hint: 'Celulares, tablets e smartwatches.' },
  { kind: 'DEVICE', category: 'COMPUTERS', label: 'Computador ou notebook', hint: 'Notebook, computador, monitor, teclado e mouse.' },
  {
    kind: 'DEVICE',
    category: 'SMALL_APPLIANCES',
    label: 'Eletrodoméstico pequeno',
    hint: 'Liquidificador, secador de cabelo, ferro de passar.',
  },
  {
    kind: 'DEVICE',
    category: 'ELECTRICAL_ITEMS',
    label: 'Outro aparelho eletrônico',
    hint: 'Rádio, controle remoto, videogame, brinquedo eletrônico.',
  },
]

/** Loose waste: counted in units, such as a bag of used batteries (PB09). */
export const WASTE_OPTIONS: ItemOption[] = [
  {
    kind: 'WASTE',
    category: 'BATTERIES',
    label: 'Pilhas e baterias',
    hint: 'Pilhas comuns, recarregáveis e baterias soltas.',
    defaultName: 'Pilhas usadas',
  },
  {
    kind: 'WASTE',
    category: 'ELECTRICAL_ITEMS',
    label: 'Cabos, carregadores e fones',
    hint: 'Acessórios soltos, sem o aparelho.',
    defaultName: 'Cabos e carregadores',
  },
]

export const ITEM_OPTIONS = [...DEVICE_OPTIONS, ...WASTE_OPTIONS]

export const KIND_LABELS: Record<ItemKind, string> = {
  DEVICE: 'Aparelhos',
  WASTE: 'Pilhas, baterias e acessórios',
}

/** What an item is, in a few words: "Celular ou tablet", "Pilhas e baterias". */
export function itemLabel(kind: ItemKind, category: Material): string {
  return ITEM_OPTIONS.find((o) => o.kind === kind && o.category === category)?.label ?? CATEGORY_LABELS[category]
}

/** Categories in charts and totals (several kinds of item may share one). */
export const CATEGORY_LABELS: Record<Material, string> = {
  MOBILE_PHONES: 'Celulares e tablets',
  COMPUTERS: 'Computadores',
  BATTERIES: 'Pilhas e baterias',
  SMALL_APPLIANCES: 'Eletrodomésticos pequenos',
  ELECTRICAL_ITEMS: 'Outros eletrônicos e acessórios',
}

/** "1 unidade", "12 unidades". */
export function units(count: number): string {
  return `${count} ${count === 1 ? 'unidade' : 'unidades'}`
}

export const BATTERY_LABELS: Record<BatteryType, string> = {
  LITHIUM: 'De lítio (celular, notebook, a maioria das recarregáveis)',
  ALKALINE: 'Pilha comum (alcalina ou zinco)',
  RECHARGEABLE: 'Pilha recarregável',
  UNKNOWN: 'Não sei',
}

/** Kinds of item for which the battery question makes sense. */
export function asksBattery(category: Material): boolean {
  return category === 'BATTERIES' || category === 'MOBILE_PHONES' || category === 'COMPUTERS'
}

/** Kinds of item for which the screen size question makes sense (only whole devices). */
export function asksScreen(kind: ItemKind, category: Material): boolean {
  return kind === 'DEVICE' && (category === 'MOBILE_PHONES' || category === 'COMPUTERS')
}

/**
 * What to do before taking the item (PB10), from the "Antes de levar seu aparelho" tips of the home
 * page. No figures without a source.
 */
export function preparationTips(kind: ItemKind, category: Material, battery: BatteryType | null): string[] {
  const tips: string[] = []
  if (kind === 'DEVICE' && (category === 'MOBILE_PHONES' || category === 'COMPUTERS')) {
    tips.push('Copie as fotos, os contatos e os arquivos que você quer manter.')
    tips.push('Saia das suas contas e restaure o aparelho para as configurações de fábrica.')
  }
  if (kind === 'DEVICE' && category === 'MOBILE_PHONES') {
    tips.push('Tire o chip e o cartão de memória. Fique com eles ou descarte-os separadamente.')
  }
  if (category === 'BATTERIES' || battery === 'LITHIUM') {
    tips.push('Cubra os polos das baterias com fita adesiva e leve-as separadas, sem amassar nem furar.')
  }
  if (kind === 'WASTE') {
    tips.push('Junte tudo num saco ou numa caixa, para levar de uma vez.')
  } else if (category === 'SMALL_APPLIANCES' || category === 'ELECTRICAL_ITEMS') {
    tips.push('Se o aparelho usa pilhas, retire-as e leve a um ponto que aceite pilhas e baterias.')
  }
  if (kind === 'DEVICE') {
    tips.push('Não desmonte o aparelho: entregue-o inteiro.')
  }
  tips.push('Confira no mapa se o ponto recebe este tipo de item e o horário. Se puder, confirme com o local.')
  return tips
}

/** "2026-11-20" as "20/11/2026", without time zone shifts. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-')
  return `${date}/${month}/${year}`
}

/** Today in São Paulo as yyyy-MM-dd (the API uses the same calendar). */
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
