import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../auth/useAuth.ts'
import { describeFontLevel, type FontLevel, useFontSize } from '../lib/fontSize.ts'
import { useUnreadNotices } from '../lib/notices.ts'
import { useTheme } from '../lib/theme.ts'
import GuidedTour from '../tour/GuidedTour.tsx'
import { TourProvider } from '../tour/TourProvider.tsx'
import { useTour } from '../tour/useTour.ts'
import { BellIcon, CloseIcon, HelpCircleIcon, MenuIcon, MoonIcon, SunIcon } from './icons.tsx'

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
      {status === 'signed-in' && (
        <li>
          <NavLink to="/meus-aparelhos" className={navLinkClass}>
            Meus itens
          </NavLink>
        </li>
      )}
      {account?.role === 'ADMIN' && (
        <li>
          <NavLink to="/admin/pontos" className={navLinkClass}>
            Administração
          </NavLink>
        </li>
      )}
      {/* Nothing while a saved session is being confirmed, so "Entrar" does not flash for signed-in people. */}
      {status === 'signed-in' && (
        <li data-tour="conta">
          <NavLink to="/conta" className={navLinkClass}>
            Minha conta
          </NavLink>
        </li>
      )}
      {status === 'signed-out' && (
        <li data-tour="conta">
          <NavLink to="/entrar" className={navLinkClass}>
            Entrar
          </NavLink>
        </li>
      )}
    </>
  )
}

/** "Avisos" with the number of unread notices (PB19), only for signed-in people. */
function NoticesLink() {
  const { status } = useAuth()
  const unread = useUnreadNotices()
  if (status !== 'signed-in') {
    return null
  }
  const label = unread === 0 ? 'Avisos' : `Avisos, ${unread} ${unread === 1 ? 'não lido' : 'não lidos'}`
  return (
    <NavLink
      to="/avisos"
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        `relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 ${isActive ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`
      }
    >
      <BellIcon />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-xs font-bold text-white"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  )
}

/**
 * With bigger text the full desktop menu needs more room, so it gives way to the collapsed menu on wider
 * screens (media queries keep the browser's own text size, not the one chosen on the site).
 */
const DESKTOP_MENU: Record<FontLevel, { show: string; showFlex: string; hide: string }> = {
  87.5: { show: 'lg:flex', showFlex: 'lg:flex', hide: 'lg:hidden' },
  100: { show: 'lg:flex', showFlex: 'lg:flex', hide: 'lg:hidden' },
  112.5: { show: 'xl:flex', showFlex: 'xl:flex', hide: 'xl:hidden' },
  125: { show: 'xl:flex', showFlex: 'xl:flex', hide: 'xl:hidden' },
  150: { show: '', showFlex: '', hide: '' },
}

const ICON_BUTTON =
  'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:text-slate-600'

/** "A−" and "A+": smaller or bigger text on the whole site (PB21). */
function FontSizeButtons({ className = '' }: { className?: string }) {
  const { level, canDecrease, canIncrease, decrease, increase } = useFontSize()
  return (
    <div role="group" aria-label="Tamanho do texto" className={`items-center ${className}`}>
      <button
        type="button"
        onClick={decrease}
        disabled={!canDecrease}
        aria-label="Diminuir o texto"
        title="Diminuir o texto"
        className={ICON_BUTTON}
      >
        <span aria-hidden="true" className="text-sm">
          A−
        </span>
      </button>
      <button
        type="button"
        onClick={increase}
        disabled={!canIncrease}
        aria-label="Aumentar o texto"
        title="Aumentar o texto"
        className={ICON_BUTTON}
      >
        <span aria-hidden="true" className="text-lg">
          A+
        </span>
      </button>
      <span className="sr-only" role="status">
        {`Texto em ${describeFontLevel(level)}.`}
      </span>
    </div>
  )
}

function LayoutContent() {
  const menuId = useId()
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { startTour } = useTour()
  const fontSize = useFontSize()
  const desktop = DESKTOP_MENU[fontSize.level]
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
          <Link
            to="/"
            data-tour="logo"
            className="rounded-md text-xl font-bold text-emerald-800 dark:text-emerald-400"
          >
            E-Cicla
          </Link>
          <nav aria-label="Principal" data-tour="menu" className="flex items-center gap-1 md:gap-2">
            <ul className={`hidden items-center gap-1 ${desktop.show}`}>
              <NavLinks />
            </ul>

            <button
              type="button"
              onClick={() => startTour()}
              aria-label="Iniciar tutorial guiado"
              title="Tutorial guiado"
              className={`hidden items-center gap-1.5 rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${desktop.showFlex}`}
            >
              <HelpCircleIcon className="size-5" />
              <span>Tutorial</span>
            </button>

            <NoticesLink />

            <div data-tour="preferencias" className="flex items-center">
              {/* On narrow phones the size buttons live in the menu, so the header does not overflow. */}
              <FontSizeButtons className="hidden sm:flex" />
              <button
                type="button"
                onClick={toggleTheme}
                aria-pressed={isDark}
                aria-label={themeLabel}
                title={themeLabel}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${desktop.hide}`}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
              <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
            </button>

            <ul
              id={menuId}
              hidden={!menuOpen}
              className={`absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] space-y-1 overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 ${desktop.hide}`}
            >
              <NavLinks />
              <li className="border-t border-slate-200 pt-2 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    startTour()
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <HelpCircleIcon className="size-5" />
                  <span>Tutorial</span>
                </button>
              </li>
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
              <li className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-3 pt-2 sm:hidden dark:border-slate-800">
                <span className="text-base font-medium text-slate-700 dark:text-slate-300">Tamanho do texto</span>
                <FontSizeButtons className="flex" />
                {!fontSize.isDefault && (
                  <button
                    type="button"
                    onClick={fontSize.reset}
                    className="rounded-md px-2 py-2 font-semibold text-emerald-800 underline underline-offset-4 dark:text-emerald-400"
                  >
                    Tamanho normal
                  </button>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
        <Outlet />
      </main>

      <GuidedTour />
    </div>
  )
}

export default function Layout() {
  return (
    <TourProvider>
      <LayoutContent />
    </TourProvider>
  )
}
