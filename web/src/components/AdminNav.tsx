import { NavLink } from 'react-router'

function tabClass({ isActive }: { isActive: boolean }) {
  const base = 'inline-block border-b-2 px-4 py-2.5 text-base font-semibold transition-colors'
  return isActive
    ? `${base} border-emerald-700 text-emerald-900 dark:border-emerald-500 dark:text-emerald-300`
    : `${base} border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200`
}

/** Shared navigation bar across administrator pages. */
export default function AdminNav() {
  return (
    <nav aria-label="Administração" className="mb-6 border-b border-slate-200 dark:border-slate-800">
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
