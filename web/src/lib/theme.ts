import { useEffect, useState } from 'react'

export type Theme = 'claro' | 'escuro'

const THEME_STORAGE_KEY = 'ecicla:tema'
const THEME_EVENT = 'ecicla:theme-change'

export function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'escuro'
  }
  return 'claro'
}

export function getTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'claro'
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'claro' || saved === 'escuro') {
      return saved
    }
  } catch {
    // Mode private or storage restricted
  }
  return getSystemTheme()
}

export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Mode private or storage restricted
  }

  if (theme === 'escuro') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }))
}

export function useTheme() {
  const [theme, setLocalTheme] = useState<Theme>(getTheme)

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<Theme>
      if (customEvent.detail === 'claro' || customEvent.detail === 'escuro') {
        setLocalTheme(customEvent.detail)
      } else {
        setLocalTheme(getTheme())
      }
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY)
        if (!saved) {
          const sys = getSystemTheme()
          setLocalTheme(sys)
          if (sys === 'escuro') {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
        }
      } catch {
        const sys = getSystemTheme()
        setLocalTheme(sys)
      }
    }

    window.addEventListener(THEME_EVENT, handleThemeChange)
    mediaQuery.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'escuro' ? 'claro' : 'escuro'
    setTheme(next)
  }

  return { theme, setTheme, toggleTheme }
}
