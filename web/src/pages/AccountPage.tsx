import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { isApiError } from '../api/client.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Notice, TextField } from '../components/forms.tsx'
import { loginPath } from '../lib/navigation.ts'
import { DANGER_BUTTON, PAGE, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

export default function AccountPage() {
  const { status, account, logout, deleteAccount } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  // Set when leaving on purpose (signing out or deleting), so the page does not send people to "Entrar" meanwhile.
  const [leaving, setLeaving] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (deleting) {
      passwordRef.current?.focus()
    }
  }, [deleting])

  if (status === 'checking') {
    return (
      <div className={PAGE}>
        <p role="status" className="text-slate-700">
          Carregando sua conta…
        </p>
      </div>
    )
  }
  if (status === 'signed-out' || !account) {
    return leaving ? null : <Navigate to={loginPath(location.pathname)} replace />
  }

  async function signOut() {
    setLeaving(true)
    await logout()
    navigate('/', { replace: true })
  }

  async function confirmDeletion(event: FormEvent) {
    event.preventDefault()
    if (!password) {
      setError('Digite sua senha para confirmar.')
      passwordRef.current?.focus()
      return
    }
    setSending(true)
    setError(null)
    setLeaving(true)
    try {
      await deleteAccount(password)
      navigate('/', { replace: true, state: { message: 'Sua conta e seus dados pessoais foram excluídos.' } })
    } catch (caught) {
      setSending(false)
      setLeaving(false)
      setError(
        isApiError(caught, 403)
          ? 'Senha incorreta. A conta não foi excluída.'
          : 'Não foi possível excluir a conta agora. Tente de novo mais tarde.',
      )
      passwordRef.current?.focus()
    }
  }

  return (
    <div className={PAGE}>
      <title>Minha conta | E-Cicla</title>
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold text-slate-900">Minha conta</h1>

        <dl className="mt-6 space-y-3 rounded-xl border border-slate-200 p-5">
          <div>
            <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">Nome</dt>
            <dd className="mt-0.5 text-lg text-slate-900">{account.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">E-mail</dt>
            <dd className="mt-0.5 text-lg text-slate-900">{account.email}</dd>
          </div>
          {account.role === 'ADMIN' && (
            <div>
              <dt className="text-sm font-semibold tracking-wide text-slate-600 uppercase">Perfil</dt>
              <dd className="mt-0.5 text-lg text-slate-900">
                Administrador.{' '}
                <Link to="/admin/pontos" className={TEXT_LINK}>
                  Ir para a administração
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <button type="button" onClick={signOut} className={`${SECONDARY_BUTTON} mt-6`}>
          Sair da conta
        </button>

        <section aria-labelledby="privacidade-titulo" className="mt-10 border-t border-slate-200 pt-8">
          <h2 id="privacidade-titulo" className="text-xl font-bold text-slate-900">
            Dados e privacidade
          </h2>
          <p className="mt-2 text-slate-700">
            Veja quais dados o E-Cicla guarda e para quê na{' '}
            <Link to="/privacidade" className={TEXT_LINK}>
              política de privacidade
            </Link>
            .
          </p>

          {!deleting ? (
            <button type="button" onClick={() => setDeleting(true)} className={`${DANGER_BUTTON} mt-6`}>
              Excluir minha conta
            </button>
          ) : (
            <form onSubmit={confirmDeletion} noValidate className="mt-6 space-y-4 rounded-xl border border-red-200 bg-red-50 p-5">
              <h3 className="text-lg font-semibold text-red-950">Excluir a conta</h3>
              <p className="text-red-950">
                Sua conta e seus dados pessoais serão apagados. Isso não pode ser desfeito. Para confirmar, digite sua
                senha.
              </p>
              {error && <Notice kind="error">{error}</Notice>}
              <TextField
                ref={passwordRef}
                label="Senha"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={sending} className={DANGER_BUTTON}>
                  {sending ? 'Excluindo…' : 'Excluir definitivamente'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleting(false)
                    setPassword('')
                    setError(null)
                  }}
                  className={SECONDARY_BUTTON}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
