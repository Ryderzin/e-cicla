import { NavLink } from 'react-router'

function tabClass({ isActive }: { isActive: boolean }) {
  const base = 'inline-block border-b-2 px-4 py-2.5 text-base font-semibold'
  return isActive
    ? `${base} border-emerald-700 text-emerald-900`
    : `${base} border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900`
}

/** Shared navigation bar across administrator pages. */
export default function AdminNav() {
  return (
    <nav aria-label="Administração" className="mb-6 border-b border-slate-200">
      <ul className="-mb-px flex flex-wrap gap-2">
        <li>
          <NavLink to="/admin/pontos" className={tabClass}>
            Pontos de coleta
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin/sugestoes" className={tabClass}>
            Sugestões
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
