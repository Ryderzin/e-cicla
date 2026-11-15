import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { fetchInbox, type Inbox, markAllNoticesRead, markNoticeRead } from '../api/notifications.ts'
import { Notice } from '../components/forms.tsx'
import RequireSignIn from '../components/RequireSignIn.tsx'
import { noticesChanged } from '../lib/notices.ts'
import { PAGE, SECONDARY_BUTTON, TEXT_LINK } from '../lib/ui.ts'

type InboxState = { status: 'loading' } | { status: 'error' } | { status: 'success'; inbox: Inbox }

/** "Avisos" (PB19): notices about suggestions and reminders of devices not delivered yet. */
export default function NotificationsPage() {
  return (
    <RequireSignIn title="Avisos" reason="Entre na sua conta para ver os avisos sobre suas sugestões e seus aparelhos.">
      <NoticesList />
    </RequireSignIn>
  )
}

function NoticesList() {
  const [state, setState] = useState<InboxState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchInbox(controller.signal)
      .then((inbox) => setState({ status: 'success', inbox }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error' })
        }
      })
    return () => controller.abort()
  }, [attempt])

  function markLocally(ids: string[] | 'all') {
    setState((current) =>
      current.status === 'success'
        ? {
            status: 'success',
            inbox: {
              items: current.inbox.items.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n)),
              unreadCount: ids === 'all' ? 0 : Math.max(0, current.inbox.unreadCount - ids.length),
            },
          }
        : current,
    )
    noticesChanged()
  }

  async function readAll() {
    try {
      await markAllNoticesRead()
      markLocally('all')
    } catch {
      // Nothing changes on the page; the person can try again.
    }
  }

  return (
    <div className={`${PAGE} max-w-3xl`}>
      <title>Avisos | E-Cicla</title>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Avisos</h1>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">
            Respostas às suas sugestões e lembretes dos aparelhos que ainda não foram entregues.
          </p>
        </div>
        {state.status === 'success' && state.inbox.unreadCount > 0 && (
          <button type="button" onClick={() => void readAll()} className={SECONDARY_BUTTON}>
            Marcar todos como lidos
          </button>
        )}
      </div>
      <p className="mt-3 text-slate-700 dark:text-slate-300">
        Para receber os avisos também por e-mail, escolha em{' '}
        <Link to="/conta" className={TEXT_LINK}>
          Minha conta
        </Link>
        .
      </p>

      {state.status === 'loading' && (
        <p role="status" className="mt-8 text-slate-700 dark:text-slate-300">
          Carregando avisos…
        </p>
      )}
      {state.status === 'error' && (
        <div className="mt-8 space-y-3">
          <Notice kind="error">Não foi possível carregar os avisos.</Notice>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={SECONDARY_BUTTON}>
            Tentar de novo
          </button>
        </div>
      )}
      {state.status === 'success' && state.inbox.items.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-700 dark:border-slate-700 dark:text-slate-300">
          Você não tem avisos.
        </p>
      )}
      {state.status === 'success' && state.inbox.items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {state.inbox.items.map((notice) => (
            <li
              key={notice.id}
              className={`rounded-xl border p-4 ${notice.read ? 'border-slate-200 dark:border-slate-800' : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {!notice.read && <span className="sr-only">Não lido: </span>}
                  {notice.title}
                </h2>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(notice.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{notice.message}</p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                <Link
                  to={notice.link}
                  onClick={() => {
                    if (!notice.read) {
                      void markNoticeRead(notice.id).then(() => markLocally([notice.id]), () => undefined)
                    }
                  }}
                  className={TEXT_LINK}
                >
                  {notice.type === 'DEVICE_REMINDER' ? 'Ver meus itens' : 'Ver minhas sugestões'}
                </Link>
                {!notice.read && (
                  <button
                    type="button"
                    onClick={() => void markNoticeRead(notice.id).then(() => markLocally([notice.id]), () => undefined)}
                    className="font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-950 dark:text-slate-300"
                  >
                    Marcar como lido<span className="sr-only">: {notice.title}</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
