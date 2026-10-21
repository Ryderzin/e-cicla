import { type FormEvent, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { PASSWORD_MAX, PASSWORD_MIN, resetPassword } from '../api/account.ts'
import { isApiError } from '../api/client.ts'
import { Notice, TextField } from '../components/forms.tsx'
import { BackIcon } from '../components/icons.tsx'
import { PAGE, PRIMARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmation?: string }>({})
  const [saving, setSaving] = useState(false)

  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: { password?: string; confirmation?: string } = {}
    if (password.length < PASSWORD_MIN) {
      nextErrors.password = `A nova senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`
    }
    if (password !== confirmation) {
      nextErrors.confirmation = 'A confirmação precisa ser idêntica à nova senha digitada.'
    }
    setFieldErrors(nextErrors)
    setError(null)
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }
    if (nextErrors.confirmation) {
      confirmationRef.current?.focus()
      return
    }

    setSaving(true)
    try {
      await resetPassword(token, password)
      navigate('/entrar', {
        replace: true,
        state: { message: 'Sua senha foi redefinida com sucesso. Entre com a nova senha.' },
      })
    } catch (caught) {
      setSaving(false)
      setError(
        isApiError(caught, 400)
          ? 'Este link de redefinição expirou ou é inválido. Solicite um novo link de recuperação.'
          : 'Não foi possível redefinir a senha agora. Verifique sua conexão e tente de novo.',
      )
    }
  }

  return (
    <div className={PAGE}>
      <title>Redefinir senha | E-Cicla</title>
      <div className="mx-auto max-w-md">
        <Link
          to="/entrar"
          className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950"
        >
          <BackIcon className="size-5" />
          Voltar para o login
        </Link>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">Criar nova senha</h1>
        <p className="mt-2 text-lg text-slate-700">
          Escolha uma nova senha forte para acessar sua conta no E-Cicla.
        </p>

        {!token ? (
          <div className="mt-6 space-y-4">
            <Notice kind="error">
              Link de redefinição incompleto ou inválido. O link precisa conter o código enviado por e-mail.
            </Notice>
            <p className="text-slate-700">
              Precisa de um novo link?{' '}
              <Link to="/esqueci-minha-senha" className={TEXT_LINK}>
                Solicitar recuperação de senha
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            {error && (
              <div className="space-y-2">
                <Notice kind="error">{error}</Notice>
                {error.includes('expirou') && (
                  <p className="text-sm text-slate-700">
                    <Link to="/esqueci-minha-senha" className={TEXT_LINK}>
                      Clique aqui para solicitar um novo link de recuperação.
                    </Link>
                  </p>
                )}
              </div>
            )}

            <TextField
              ref={passwordRef}
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              hint={`Use pelo menos ${PASSWORD_MIN} caracteres.`}
              maxLength={PASSWORD_MAX}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              required
            />

            <TextField
              ref={confirmationRef}
              label="Confirme a nova senha"
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              error={fieldErrors.confirmation}
              required
            />

            <button type="submit" disabled={saving} className={`${PRIMARY_BUTTON} w-full`}>
              {saving ? 'Salvando nova senha…' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
