import type { BatteryType } from '../api/devices'
import type { Material } from '../api/points'

/** How each kind of device is called in the questions (plain words, PB09). */
export const DEVICE_KINDS: { value: Material; label: string; hint: string }[] = [
  { value: 'MOBILE_PHONES', label: 'Celular ou tablet', hint: 'Inclui carregadores e fones.' },
  { value: 'COMPUTERS', label: 'Computador ou notebook', hint: 'Inclui teclado, mouse e monitor.' },
  { value: 'BATTERIES', label: 'Pilhas e baterias', hint: 'Pilhas comuns, recarregáveis e baterias.' },
  { value: 'SMALL_APPLIANCES', label: 'Eletrodoméstico pequeno', hint: 'Liquidificador, secador, ferro de passar.' },
  {
    value: 'ELECTRICAL_ITEMS',
    label: 'Outro aparelho elétrico ou eletrônico',
    hint: 'Rádio, controle remoto, brinquedo eletrônico.',
  },
]

export const DEVICE_KIND_LABELS = Object.fromEntries(DEVICE_KINDS.map((k) => [k.value, k.label])) as Record<
  Material,
  string
>

export const BATTERY_LABELS: Record<BatteryType, string> = {
  LITHIUM: 'De lítio (celular, notebook, a maioria das recarregáveis)',
  ALKALINE: 'Pilha comum (alcalina ou zinco)',
  RECHARGEABLE: 'Pilha recarregável',
  UNKNOWN: 'Não sei',
}

/** Kinds of device for which the battery question makes sense. */
export function asksBattery(kind: Material): boolean {
  return kind === 'BATTERIES' || kind === 'MOBILE_PHONES' || kind === 'COMPUTERS'
}

/** Kinds of device for which the screen size question makes sense. */
export function asksScreen(kind: Material): boolean {
  return kind === 'MOBILE_PHONES' || kind === 'COMPUTERS'
}

/**
 * What to do before taking the device (PB10), from the "Antes de levar seu aparelho" tips of the home
 * page. No figures without a source.
 */
export function preparationTips(kind: Material, battery: BatteryType | null): string[] {
  const tips: string[] = []
  if (kind === 'MOBILE_PHONES' || kind === 'COMPUTERS') {
    tips.push('Copie as fotos, os contatos e os arquivos que você quer manter.')
    tips.push('Saia das suas contas e restaure o aparelho para as configurações de fábrica.')
  }
  if (kind === 'MOBILE_PHONES') {
    tips.push('Tire o chip e o cartão de memória. Fique com eles ou descarte-os separadamente.')
  }
  if (kind === 'BATTERIES' || battery === 'LITHIUM') {
    tips.push('Cubra os polos das baterias com fita adesiva e leve-as separadas, sem amassar nem furar.')
  } else if (kind === 'SMALL_APPLIANCES' || kind === 'ELECTRICAL_ITEMS') {
    tips.push('Se o aparelho usa pilhas, retire-as e leve a um ponto que aceite pilhas e baterias.')
  }
  tips.push('Não desmonte o aparelho: entregue-o inteiro.')
  tips.push('Confira no mapa se o ponto recebe este tipo de aparelho e o horário. Se puder, confirme com o local.')
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
