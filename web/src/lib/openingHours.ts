// Translates the common subset of the OpenStreetMap "opening_hours" format into Portuguese,
// e.g. "Mo-Fr 08:00-17:00; Sa 08:00-12:00; PH off". Anything outside that subset returns null,
// and the caller shows the original text instead.

export interface OpeningHoursRow {
  days: string
  hours: string
}

const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const
type Day = (typeof DAY_ORDER)[number]

const DAY_NAMES: Record<Day | 'PH', string> = {
  Mo: 'segunda',
  Tu: 'terça',
  We: 'quarta',
  Th: 'quinta',
  Fr: 'sexta',
  Sa: 'sábado',
  Su: 'domingo',
  PH: 'feriados',
}

const DAY_SELECTOR = /^(Mo|Tu|We|Th|Fr|Sa|Su|PH)(-(Mo|Tu|We|Th|Fr|Sa|Su))?(,(Mo|Tu|We|Th|Fr|Sa|Su|PH)(-(Mo|Tu|We|Th|Fr|Sa|Su))?)*$/
const TIME_RANGE = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/

export function parseOpeningHours(value: string): OpeningHoursRow[] | null {
  const text = value.trim()
  if (text === '24/7') {
    return [{ days: 'Todos os dias', hours: '24 horas' }]
  }

  const rules = text.split(';').map((rule) => rule.trim()).filter(Boolean)
  if (rules.length === 0) {
    return null
  }

  const rows: OpeningHoursRow[] = []
  for (const rule of rules) {
    const row = parseRule(rule)
    if (!row) {
      return null
    }
    rows.push(row)
  }
  return rows
}

function parseRule(rule: string): OpeningHoursRow | null {
  // "Mo-Fr 08:00-12:00, 13:00-17:00" -> selector "Mo-Fr", times "08:00-12:00,13:00-17:00"
  const [first, ...rest] = rule.split(/\s+/)
  let selector: string | null = null
  let times = rule
  if (/^(Mo|Tu|We|Th|Fr|Sa|Su|PH)/.test(first)) {
    selector = first
    times = rest.join('')
  }

  const days = selector === null ? 'Todos os dias' : formatDays(selector)
  const hours = formatTimes(times.replace(/\s+/g, ''))
  if (days === null || hours === null) {
    return null
  }
  return { days, hours }
}

function formatDays(selector: string): string | null {
  if (!DAY_SELECTOR.test(selector)) {
    return null
  }
  const parts = selector.split(',').map((part) => {
    const [from, to] = part.split('-') as [Day | 'PH', Day | undefined]
    if (to === undefined) {
      return DAY_NAMES[from]
    }
    if (from === 'Mo' && to === 'Su') {
      return 'todos os dias'
    }
    return `${DAY_NAMES[from]} a ${DAY_NAMES[to]}`
  })
  return capitalize(joinList(parts))
}

function formatTimes(times: string): string | null {
  if (times === '') {
    return null
  }
  if (times === 'off' || times === 'closed') {
    return 'Fechado'
  }
  const ranges = times.split(',').map((range) => {
    const match = TIME_RANGE.exec(range)
    if (!match) {
      return null
    }
    const [, fromHour, fromMinute, toHour, toMinute] = match
    if (Number(fromHour) > 24 || Number(toHour) > 24 || Number(fromMinute) > 59 || Number(toMinute) > 59) {
      return null
    }
    return `${fromHour.padStart(2, '0')}:${fromMinute} às ${toHour.padStart(2, '0')}:${toMinute}`
  })
  if (ranges.some((range) => range === null)) {
    return null
  }
  return joinList(ranges as string[])
}

function joinList(items: string[]): string {
  if (items.length <= 1) {
    return items.join('')
  }
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
