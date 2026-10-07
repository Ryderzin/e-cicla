const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

/** An answer from the API with an error status (4xx or 5xx). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

// The session token lives here and in localStorage (see auth/AuthProvider), so every request can send it.
let sessionToken: string | null = null
let onSessionExpired: (() => void) | null = null

export function setSessionToken(token: string | null) {
  sessionToken = token
}

/** Called when the API says the session sent with a request is no longer valid. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function request<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token = sessionToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    if (response.status === 401 && token && token === sessionToken) {
      onSessionExpired?.()
    }
    throw new ApiError(response.status, `${method} ${path} failed with status ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/** Query string from optional values, skipping the empty ones. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] != null)
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))}` : ''
}
