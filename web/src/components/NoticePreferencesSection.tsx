import { useEffect, useState } from 'react'

import { fetchNoticePreferences, type NoticePreferences, updateNoticePreferences } from '../api/notifications.ts'

/** "Avisos por e-mail" in "Minha conta" (PB19). Notices on the site are always on; e-mail starts off. */
export default function NoticePreferencesSection() {
  const [preferences, setPreferences] = useState<NoticePreferences | null>(null)
  const [failed, setFailed] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetchNoticePreferences(controller.signal)
      .then(setPreferences)
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true)
        }
      })
    return () => controller.abort()
  }, [])

  async function change(next: NoticePreferences) {
    const previous = preferences
    setPreferences(next)
    setStatus('')
    try {
      setPreferences(await updateNoticePreferences(next))
      setStatus('Preferência salva.')
    } catch {
      setPreferences(previous)
      setStatus('Não foi possível salvar. Tente de novo.')
    }
  }

  return (
    <section aria-labelledby="avisos-email-titulo" className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
      <h2 id="avisos-email-titulo" className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Avisos por e-mail
      </h2>
      <p className="mt-1 text-slate-700 dark:text-slate-300">
        Os avisos sempre aparecem no site, em “Avisos”. Escolha quais também chegam no seu e-mail.
      </p>
      {failed && <p className="mt-3 text-red-800 dark:text-red-300">Não foi possível carregar suas preferências.</p>}
      {preferences && (
        <fieldset className="mt-4 space-y-3">
          <legend className="sr-only">Avisos que chegam por e-mail</legend>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.suggestionUpdatesEmail}
              onChange={(event) => void change({ ...preferences, suggestionUpdatesEmail: event.target.checked })}
              className="mt-1 size-5 accent-emerald-700"
            />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-slate-100">Respostas às minhas sugestões</span>
              <span className="text-slate-700 dark:text-slate-300">Quando a equipe aprovar ou não aprovar uma sugestão sua.</span>
            </span>
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={preferences.remindersEmail}
              onChange={(event) => void change({ ...preferences, remindersEmail: event.target.checked })}
              className="mt-1 size-5 accent-emerald-700"
            />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-slate-100">Lembretes dos meus aparelhos</span>
              <span className="text-slate-700 dark:text-slate-300">
                Quando um aparelho cadastrado há mais de 30 dias ainda não foi entregue (no máximo um a cada 30 dias).
              </span>
            </span>
          </label>
        </fieldset>
      )}
      <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-700 dark:text-slate-300">
        {status}
      </p>
    </section>
  )
}
