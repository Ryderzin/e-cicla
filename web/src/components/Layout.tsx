import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../auth/useAuth.ts'
import { useTheme } from '../lib/theme.ts'
import { CloseIcon, MenuIcon, MoonIcon, SunIcon } from './icons.tsx'

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base = 'block rounded-md px-3 py-2 text-base font-medium transition-colors'
  return isActive
    ? `${base} bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200`
    : `${base} text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100`
}

function NavLinks() {
  const { status, account } = useAuth()
  return (
    <>
      <li>
        <NavLink to="/" end className={navLinkClass}>
          Início
        </NavLink>
      </li>
      <li>
        <NavLink to="/mapa" className={navLinkClass}>
          Mapa de pontos
        </NavLink>
      </li>
      <li>
        <NavLink to="/sugestoes" className={navLinkClass}>
          Sugestões
        </NavLink>
      </li>
      {account?.role === 'ADMIN' && (
        <li>
          <NavLink to="/admin/pontos" className={navLinkClass}>
            Administração
          </NavLink>
        </li>
      )}
      {/* Nothing while a saved session is being confirmed, so "Entrar" does not flash for signed-in people. */}
      {status === 'signed-in' && (
        <li>
          <NavLink to="/conta" className={navLinkClass}>
            Minha conta
          </NavLink>
        </li>
      )}
      {status === 'signed-out' && (
        <li>
          <NavLink to="/entrar" className={navLinkClass}>
            Entrar
          </NavLink>
        </li>
      )}
    </>
  )
}

export default function Layout() {
  const menuId = useId()
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'escuro'
  const themeLabel = isDark ? 'Ativar tema claro' : 'Ativar tema escuro'

  // The phone menu stays open only on the page where it was opened, so it closes when the page changes.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const menuOpen = openOn === pathname
  const setMenuOpen = (open: boolean) => setOpenOn(open ? pathname : null)

  // ...and with the Escape key.
  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenOn(null)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('conteudo')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg dark:focus:bg-slate-900 dark:focus:text-slate-100"
      >
        Pular para o conteúdo
      </a>

      <header className="relative z-[1500] border-b border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="rounded-md text-xl font-bold text-emerald-800 dark:text-emerald-400">
            E-Cicla
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 md:gap-2">
            <ul className="hidden items-center gap-1 md:flex">
              <NavLinks />
            </ul>

            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
              aria-label={themeLabel}
              title={themeLabel}
              className="rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
              <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
            </button>

            <ul
              id={menuId}
              hidden={!menuOpen}
              className="absolute inset-x-0 top-full space-y-1 border-b border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden"
            >
              <NavLinks />
              <li className="border-t border-slate-200 pt-2 dark:border-slate-800">
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-pressed={isDark}
                  aria-label={themeLabel}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  {isDark ? <SunIcon /> : <MoonIcon />}
                  <span>{isDark ? 'Tema claro' : 'Tema escuro'}</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        <Outlet />
      </main>
    </div>
  )
}
