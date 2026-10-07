import { request } from './client.ts'

export type Role = 'USER' | 'ADMIN'

export interface Account {
  id: string
  name: string
  email: string
  role: Role
}

export interface SessionResponse {
  token: string
  account: Account
}

export interface Registration {
  name: string
  email: string
  password: string
  acceptPrivacy: boolean
}

// Same limits as the API (AccountService).
export const NAME_MIN = 2
export const NAME_MAX = 80
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

export function register(data: Registration): Promise<SessionResponse> {
  return request<SessionResponse>('/api/auth/register', { method: 'POST', body: data })
}

export function login(email: string, password: string): Promise<SessionResponse> {
  return request<SessionResponse>('/api/auth/login', { method: 'POST', body: { email, password } })
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST' })
}

export function fetchAccount(signal?: AbortSignal): Promise<Account> {
  return request<Account>('/api/me', { signal })
}

export function deleteAccount(password: string): Promise<void> {
  return request<void>('/api/me', { method: 'DELETE', body: { password } })
}
