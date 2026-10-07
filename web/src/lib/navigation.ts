/**
 * The page to go back to after signing in, from the "voltar" parameter. Only paths inside the site are
 * accepted, so a link cannot send people to another website after they sign in.
 */
export function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }
  return value
}

/** Address of the sign-in page that comes back to the current page afterwards. */
export function loginPath(currentPath: string): string {
  return `/entrar?voltar=${encodeURIComponent(currentPath)}`
}
