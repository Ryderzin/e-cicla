import { Link, NavLink, Outlet } from 'react-router'

import { LogoIcon } from './icons.tsx'

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base = 'rounded-md px-3 py-2 text-sm font-medium sm:text-base'
  return isActive
    ? `${base} bg-emerald-100 text-emerald-900`
    : `${base} text-slate-700 hover:bg-slate-100 hover:text-slate-900`
}

export default function Layout() {
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

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 rounded-md text-xl font-bold text-emerald-800">
            <LogoIcon className="size-7" />
            E-Cicla
          </Link>
          <nav aria-label="Principal">
            <ul className="flex items-center gap-1">
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
