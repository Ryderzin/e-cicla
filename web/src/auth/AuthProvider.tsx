import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import * as api from '../api/account.ts'
import type { Account, Registration, SessionResponse } from '../api/account.ts'
import { isApiError, setSessionExpiredHandler, setSessionToken } from '../api/client.ts'
import { AuthContext, type AuthState } from './context.ts'

const STORAGE_KEY = 'e-cicla.session'

// localStorage can be unavailable (private mode, blocked site data); the site still works, only
// the session is not remembered after closing the tab.
function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Not remembered; see readToken.
  }
}

/** Keeps the signed-in account for the whole site. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [savedToken] = useState(readToken)
  const [status, setStatus] = useState<AuthState['status']>(savedToken ? 'checking' : 'signed-out')
  const [account, setAccount] = useState<Account | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const clearSession = useCallback(() => {
    setSessionToken(null)
    writeToken(null)
    setAccount(null)
    setStatus('signed-out')
  }, [])

  const startSession = useCallback((session: SessionResponse) => {
    setSessionToken(session.token)
    writeToken(session.token)
    setAccount(session.account)
    setSessionExpired(false)
    setStatus('signed-in')
  }, [])

  // Any request answered with "signed out" ends the session here too.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession()
      setSessionExpired(true)
    })
    return () => setSessionExpiredHandler(null)
  }, [clearSession])

  // Confirms the session saved in the browser, if there is one.
  useEffect(() => {
    if (!savedToken) {
      return
    }
    const controller = new AbortController()
    setSessionToken(savedToken)
    api
      .fetchAccount(controller.signal)
      .then((found) => {
        setAccount(found)
        setStatus('signed-in')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        if (isApiError(error, 401)) {
          clearSession()
        } else {
          // API unreachable (e.g. still waking up): stay signed out for now, but keep the token for the next visit.
          setSessionToken(null)
          setStatus('signed-out')
        }
      })
    return () => controller.abort()
  }, [savedToken, clearSession])

  const login = useCallback(
    async (email: string, password: string) => startSession(await api.login(email, password)),
    [startSession],
  )

  const register = useCallback(async (data: Registration) => startSession(await api.register(data)), [startSession])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Signed out on this browser anyway; the session also expires by itself.
    }
    clearSession()
  }, [clearSession])

  const deleteAccount = useCallback(
    async (password: string) => {
      await api.deleteAccount(password)
      clearSession()
    },
    [clearSession],
  )

  const value = useMemo<AuthState>(
    () => ({ status, account, sessionExpired, login, register, logout, deleteAccount }),
    [status, account, sessionExpired, login, register, logout, deleteAccount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
