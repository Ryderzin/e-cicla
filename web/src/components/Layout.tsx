import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { useAuth } from '../auth/useAuth.ts'
import { CloseIcon, MenuIcon } from './icons.tsx'

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base = 'block rounded-md px-3 py-2 text-base font-medium'
  return isActive
    ? `${base} bg-emerald-100 text-emerald-900`
    : `${base} text-slate-700 hover:bg-slate-100 hover:text-slate-900`
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
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('conteudo')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>

      <header className="relative z-[1500] border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="rounded-md text-xl font-bold text-emerald-800">
            E-Cicla
          </Link>
          <nav aria-label="Principal">
            <ul className="hidden items-center gap-1 md:flex">
              <NavLinks />
            </ul>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-md p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
              <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
            </button>
            <ul
              id={menuId}
              hidden={!menuOpen}
              className="absolute inset-x-0 top-full space-y-1 border-b border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden"
            >
              <NavLinks />
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
