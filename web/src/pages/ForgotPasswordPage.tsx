import { type FormEvent, useRef, useState } from 'react'
import { Link } from 'react-router'

import { requestPasswordReset } from '../api/account.ts'
import { Notice, TextField } from '../components/forms.tsx'
import { BackIcon } from '../components/icons.tsx'
import { PAGE, PRIMARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Informe o e-mail da sua conta.')
      emailRef.current?.focus()
      return
    }
    setSending(true)
    setError(null)
    try {
      await requestPasswordReset(cleanEmail)
      setSubmitted(true)
    } catch {
      setError('Não foi possível enviar as instruções agora. Verifique sua conexão e tente de novo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={PAGE}>
      <title>Recuperar senha | E-Cicla</title>
      <div className="mx-auto max-w-md">
        <Link
          to="/entrar"
          className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950"
        >
          <BackIcon className="size-5" />
          Voltar para o login
        </Link>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">Recuperar senha</h1>
        <p className="mt-2 text-lg text-slate-700">
          Informe o e-mail cadastrado na sua conta. Vamos enviar um link seguro para você escolher uma nova senha.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <Notice kind="success">
              Se houver uma conta cadastrada com este e-mail, enviamos as instruções para a sua caixa de entrada.
              O link é válido por <strong>1 hora</strong>. Verifique também a sua pasta de spam.
            </Notice>
            <p className="text-slate-700">
              Já recebeu o e-mail ou quer tentar outro endereço?{' '}
              <Link to="/entrar" className={TEXT_LINK}>
                Voltar para o início de sessão
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            {error && <Notice kind="error">{error}</Notice>}
            <TextField
              ref={emailRef}
              label="E-mail da sua conta"
              type="email"
              autoComplete="email"
              placeholder="seu-email@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" disabled={sending} className={`${PRIMARY_BUTTON} w-full`}>
              {sending ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
