import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import { useAuth } from '../auth/useAuth.ts'
import { loginPath } from '../lib/navigation.ts'
import { PAGE, PRIMARY_BUTTON } from '../lib/ui.ts'

interface RequireSignInProps {
  /** Page title, also used as the heading when the person is signed out. */
  title: string
  /** Why the page needs an account, in plain words. */
  reason: string
  children: ReactNode
}

/** Pages of the person's own data. Signed-out visitors see why and a link to sign in. */
export default function RequireSignIn({ title, reason, children }: RequireSignInProps) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') {
    return (
      <div className={PAGE}>
        <p role="status" className="text-slate-700 dark:text-slate-300">
          Carregando…
        </p>
      </div>
    )
  }
  if (status === 'signed-out') {
    return (
      <div className={PAGE}>
        <title>{`${title} | E-Cicla`}</title>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="mt-3 text-lg text-slate-700 dark:text-slate-300">{reason}</p>
        <p className="mt-6">
          <Link to={loginPath(location.pathname)} className={PRIMARY_BUTTON}>
            Entrar na minha conta
          </Link>
        </p>
      </div>
    )
  }
  return <>{children}</>
}
