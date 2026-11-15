import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { fetchInbox } from '../api/notifications'
import { useAuth } from '../auth/useAuth'

const CHANGED = 'ecicla:avisos'

/** Tells the header that notices were read, so the counter updates without waiting for a page change. */
export function noticesChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

/**
 * Unread notices of the signed-in person (PB19). Updated when the page changes and when notices are read;
 * the API is not polled every few seconds.
 */
export function useUnreadNotices(): number {
  const { status } = useAuth()
  const { pathname } = useLocation()
  const [count, setCount] = useState(0)
  const [changes, setChanges] = useState(0)

  useEffect(() => {
    const onChange = () => setChanges((n) => n + 1)
    window.addEventListener(CHANGED, onChange)
    return () => window.removeEventListener(CHANGED, onChange)
  }, [])

  useEffect(() => {
    if (status !== 'signed-in') {
      return
    }
    const controller = new AbortController()
    fetchInbox(controller.signal)
      .then((inbox) => setCount(inbox.unreadCount))
      .catch(() => {
        // The counter is a convenience: without it, the notices page still works.
      })
    return () => controller.abort()
  }, [status, pathname, changes])

  return status === 'signed-in' ? count : 0
}
