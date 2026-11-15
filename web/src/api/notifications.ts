import { request } from './client.ts'

export type NotificationType = 'SUGGESTION_APPROVED' | 'SUGGESTION_REJECTED' | 'DEVICE_REMINDER'

export interface Notice {
  id: string
  type: NotificationType
  title: string
  message: string
  /** A path of the site, such as /sugestoes. */
  link: string
  read: boolean
  createdAt: string
}

export interface Inbox {
  items: Notice[]
  unreadCount: number
}

export interface NoticePreferences {
  suggestionUpdatesEmail: boolean
  remindersEmail: boolean
}

export function fetchInbox(signal?: AbortSignal): Promise<Inbox> {
  return request<Inbox>('/api/notifications', { signal })
}

export function markNoticeRead(id: string): Promise<void> {
  return request<void>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' })
}

export function markAllNoticesRead(): Promise<void> {
  return request<void>('/api/notifications/read-all', { method: 'PUT' })
}

export function fetchNoticePreferences(signal?: AbortSignal): Promise<NoticePreferences> {
  return request<NoticePreferences>('/api/me/notification-preferences', { signal })
}

export function updateNoticePreferences(preferences: NoticePreferences): Promise<NoticePreferences> {
  return request<NoticePreferences>('/api/me/notification-preferences', { method: 'PUT', body: preferences })
}
