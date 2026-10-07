import { type FormEvent, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'

import { NAME_MAX, NAME_MIN, PASSWORD_MAX, PASSWORD_MIN } from '../api/account.ts'
import { isApiError } from '../api/client.ts'
import { useAuth } from '../auth/useAuth.ts'
import { Notice, TextField } from '../components/forms.tsx'
import { safeNext } from '../lib/navigation.ts'
import { PAGE, PRIMARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type Field = 'name' | 'email' | 'password' | 'confirmation' | 'acceptPrivacy'
type Errors = Partial<Record<Field, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('voltar'))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const acceptPrivacyRef = useRef<HTMLInputElement>(null)

  if (status === 'signed-in' && !sending) {
    return <Navigate to={next ?? '/conta'} replace />
  }

  function validate(): Errors {
    const found: Errors = {}
    const trimmedName = name.trim()
    if (trimmedName.length < NAME_MIN || trimmedName.length > NAME_MAX) {
      found.name = `Informe seu nome, com ${NAME_MIN} a ${NAME_MAX} letras.`
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      found.email = 'Informe um e-mail válido, como nome@exemplo.com.'
    }
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      found.password = `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`
    }
    if (!found.password && confirmation !== password) {
      found.confirmation = 'As senhas não são iguais.'
    }
    if (!acceptPrivacy) {
      found.acceptPrivacy = 'Para criar a conta, é preciso concordar com a política de privacidade.'
    }
    return found
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError(null)
    const fields: [Field, HTMLInputElement | null][] = [
      ['name', nameRef.current],
      ['email', emailRef.current],
      ['password', passwordRef.current],
      ['confirmation', confirmationRef.current],
      ['acceptPrivacy', acceptPrivacyRef.current],
    ]
    const firstInvalid = fields.find(([field]) => found[field])
    if (firstInvalid) {
      firstInvalid[1]?.focus()
      return
    }
    setSending(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password, acceptPrivacy })
      navigate(next ?? '/', { replace: true })
    } catch (caught) {
      setSending(false)
      if (isApiError(caught, 409)) {
        setErrors({ email: 'Já existe uma conta com este e-mail. Entre na sua conta ou use outro e-mail.' })
        emailRef.current?.focus()
      } else if (isApiError(caught, 400)) {
        setFormError('Confira os dados informados e tente de novo.')
      } else {
        setFormError('Não foi possível criar a conta agora. Verifique sua conexão e tente de novo.')
      }
    }
  }

  return (
    <div className={PAGE}>
      <title>Criar conta | E-Cicla</title>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold text-slate-900">Criar conta</h1>
        <p className="mt-2 text-lg text-slate-700">Leva menos de um minuto.</p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          {formError && <Notice kind="error">{formError}</Notice>}
          <TextField
            ref={nameRef}
            label="Nome"
            autoComplete="name"
            maxLength={NAME_MAX}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            required
          />
          <TextField
            ref={emailRef}
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
            required
          />
          <TextField
            ref={passwordRef}
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint={`Use pelo menos ${PASSWORD_MIN} caracteres.`}
            maxLength={PASSWORD_MAX}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            required
          />
          <TextField
            ref={confirmationRef}
            label="Confirme a senha"
            type="password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            error={errors.confirmation}
            required
          />
          <div>
            <div className="flex items-start gap-3">
              <input
                ref={acceptPrivacyRef}
                id="aceite-privacidade"
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(event) => setAcceptPrivacy(event.target.checked)}
                aria-invalid={errors.acceptPrivacy ? true : undefined}
                aria-describedby={errors.acceptPrivacy ? 'aceite-privacidade-erro' : undefined}
                className="mt-1 size-5 shrink-0 accent-emerald-700"
              />
              <label htmlFor="aceite-privacidade" className="text-slate-800">
                Li e concordo com a política de privacidade.
              </label>
            </div>
            {/* Outside the label, so the checkbox's name stays short and the link is a separate stop for the keyboard. */}
            <p className="mt-1 pl-8">
              <Link to="/privacidade" target="_blank" className={TEXT_LINK}>
                Ler a política de privacidade
                <span className="sr-only"> (abre em uma nova aba)</span>
              </Link>
            </p>
            {errors.acceptPrivacy && (
              <p id="aceite-privacidade-erro" className="mt-1 text-sm font-medium text-red-800">
                {errors.acceptPrivacy}
              </p>
            )}
          </div>
          <button type="submit" disabled={sending} className={`${PRIMARY_BUTTON} w-full`}>
            {sending ? 'Criando a conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-slate-700">
          Já tem conta?{' '}
          <Link to={next ? `/entrar?voltar=${encodeURIComponent(next)}` : '/entrar'} className={TEXT_LINK}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
