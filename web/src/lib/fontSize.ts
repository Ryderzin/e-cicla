import { useEffect, useState } from 'react'

/**
 * Text size chosen by the person (PB21), as a percentage of the browser's own text size. Every size on the
 * site is in rem, so the whole page grows with it, like the browser zoom. The percentage keeps the size
 * the person already set in the browser as the base.
 */
export const FONT_LEVELS = [87.5, 100, 112.5, 125, 150] as const
export type FontLevel = (typeof FONT_LEVELS)[number]

export const DEFAULT_FONT_LEVEL: FontLevel = 100
// The same key is read by the script in index.html, which applies the size before the page shows.
const STORAGE_KEY = 'ecicla:fonte'
const EVENT = 'ecicla:font-change'

function isLevel(value: number): value is FontLevel {
  return (FONT_LEVELS as readonly number[]).includes(value)
}

export function getFontLevel(): FontLevel {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    if (isLevel(saved)) {
      return saved
    }
  } catch {
    // Private mode or blocked storage: the default size.
  }
  return DEFAULT_FONT_LEVEL
}

export function applyFontLevel(level: FontLevel): void {
  document.documentElement.style.fontSize = level === DEFAULT_FONT_LEVEL ? '' : `${level}%`
}

function saveFontLevel(level: FontLevel): void {
  try {
    if (level === DEFAULT_FONT_LEVEL) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, String(level))
    }
  } catch {
    // The size still changes for this visit.
  }
  applyFontLevel(level)
  window.dispatchEvent(new CustomEvent(EVENT, { detail: level }))
}

export function useFontSize() {
  const [level, setLevel] = useState<FontLevel>(getFontLevel)

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail
      setLevel(isLevel(detail) ? detail : getFontLevel())
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  const index = FONT_LEVELS.indexOf(level)
  return {
    level,
    canDecrease: index > 0,
    canIncrease: index < FONT_LEVELS.length - 1,
    isDefault: level === DEFAULT_FONT_LEVEL,
    decrease: () => index > 0 && saveFontLevel(FONT_LEVELS[index - 1]),
    increase: () => index < FONT_LEVELS.length - 1 && saveFontLevel(FONT_LEVELS[index + 1]),
    reset: () => saveFontLevel(DEFAULT_FONT_LEVEL),
  }
}

/** "125%" as said to the person. */
export function describeFontLevel(level: FontLevel): string {
  return level === DEFAULT_FONT_LEVEL ? 'tamanho normal' : `${String(level).replace('.', ',')}% do tamanho normal`
}
