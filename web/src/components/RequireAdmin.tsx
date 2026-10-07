import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'

import { useAuth } from '../auth/useAuth.ts'
import { loginPath } from '../lib/navigation.ts'
import { PAGE, TEXT_LINK } from '../lib/ui.ts'

/**
 * Shows the administration pages only to administrators. This is just for the screen: the API checks
 * the profile again on every request.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, account } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <div className={PAGE}>
        <p role="status" className="text-slate-700">
          Carregando…
        </p>
      </div>
    )
  }
  if (status === 'signed-out' || !account) {
    return <Navigate to={loginPath(location.pathname)} replace />
  }
  if (account.role !== 'ADMIN') {
    return (
      <div className={PAGE}>
        <title>Acesso restrito | E-Cicla</title>
        <h1 className="text-3xl font-bold text-slate-900">Acesso restrito</h1>
        <p className="mt-3 text-lg text-slate-700">Esta página é só para os administradores do E-Cicla.</p>
        <p className="mt-6">
          <Link to="/mapa" className={TEXT_LINK}>
            Ver pontos no mapa
          </Link>
        </p>
      </div>
    )
  }
  return <>{children}</>
}
