import { type FormEvent, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'

import { isApiError } from '../api/client.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Notice, TextField } from '../components/forms.tsx'
import { safeNext } from '../lib/navigation.ts'
import { PAGE, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../lib/ui.ts'

export default function LoginPage() {
  const { status, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const next = safeNext(params.get('voltar'))
  const stateMessage = (location.state as { message?: string } | null)?.message ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  if (status === 'signed-in' && !sending) {
    return <Navigate to={next ?? '/conta'} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Preencha o e-mail e a senha.')
      emailRef.current?.focus()
      return
    }
    setSending(true)
    setError(null)
    try {
      await login(email, password)
      navigate(next ?? '/', { replace: true })
    } catch (caught) {
      setSending(false)
      setError(
        isApiError(caught, 401)
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar agora. Verifique sua conexão e tente de novo.',
      )
    }
  }

  return (
    <div className={PAGE}>
      <title>Entrar | E-Cicla</title>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold text-slate-900">Entrar</h1>
        <p className="mt-2 text-lg text-slate-700">
          Entre para usar as funções da sua conta. Para consultar o mapa de pontos, não é preciso entrar.
        </p>

        {stateMessage && !error && (
          <div className="mt-6">
            <Notice kind="success">{stateMessage}</Notice>
          </div>
        )}

        {sessionExpired && !error && !stateMessage && (
          <div className="mt-6">
            <Notice kind="info">Sua sessão terminou. Entre de novo para continuar.</Notice>
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          {error && <Notice kind="error">{error}</Notice>}
          <TextField
            ref={emailRef}
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <div className="space-y-1.5">
            <TextField
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <div className="flex justify-end">
              <Link
                to="/esqueci-minha-senha"
                className="text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>
          <button type="submit" disabled={sending} className={`${PRIMARY_BUTTON} w-full`}>
            {sending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-slate-700">Ainda não tem conta?</p>
          <Link to={next ? `/criar-conta?voltar=${encodeURIComponent(next)}` : '/criar-conta'} className={`${SECONDARY_BUTTON} mt-3 w-full`}>
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  )
}
