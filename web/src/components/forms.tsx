import { type ComponentProps, type ReactNode, useId, useState } from 'react'

import { EyeIcon, EyeOffIcon } from './icons.tsx'
import { INPUT } from '../lib/ui.ts'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
}

/** Text field with its label, an optional hint and an error message linked for screen readers. */
export function TextField({
  label,
  hint,
  error,
  id,
  type,
  className,
  ...input
}: FieldProps & ComponentProps<'input'>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-dica` : undefined
  const errorId = error ? `${fieldId}-erro` : undefined
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div>
      <label htmlFor={fieldId} className="block font-semibold text-slate-900">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-slate-600">
          {hint}
        </p>
      )}
      {isPassword ? (
        <div className="relative mt-1">
          <input
            id={fieldId}
            type={effectiveType}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            className={`${INPUT} mt-0 pr-11 ${className ?? ''}`}
            {...input}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            aria-pressed={showPassword}
            title={showPassword ? 'Ocultar senha' : 'Ver senha'}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:text-emerald-800"
          >
            {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </button>
        </div>
      ) : (
        <input
          id={fieldId}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={`${INPUT} ${className ?? ''}`}
          {...input}
        />
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextAreaField({ label, hint, error, id, ...textarea }: FieldProps & ComponentProps<'textarea'>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-dica` : undefined
  const errorId = error ? `${fieldId}-erro` : undefined
  return (
    <div>
      <label htmlFor={fieldId} className="block font-semibold text-slate-900">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-slate-600">
          {hint}
        </p>
      )}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={`${INPUT} min-h-24`}
        {...textarea}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}

/** Message box: "error" is announced right away by screen readers, "success" and "info" politely. */
export function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    info: 'border-slate-200 bg-slate-50 text-slate-800',
  }[kind]
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 ${styles}`}>
      {children}
    </div>
  )
}
