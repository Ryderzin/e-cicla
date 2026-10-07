import { createContext } from 'react'

import type { Account, Registration } from '../api/account.ts'

export interface AuthState {
  /** "checking" while a saved session is being confirmed with the API, right after the site opens. */
  status: 'checking' | 'signed-out' | 'signed-in'
  account: Account | null
  /** True when the last session ended by itself (expired or removed), to explain it on the sign-in page. */
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: Registration) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
