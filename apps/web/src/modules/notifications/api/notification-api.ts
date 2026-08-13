import { API_BASE } from '@/lib/api';
/**
 * Notification REST API client.
 * All calls are against /api/v1/notifications (user-scoped, no workspaceId needed).
 */

import type { NotificationItem, NotificationPage } from '../types';

const BASE = `${API_BASE}/api/v1/notifications`;

const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function listNotifications(
  token: string,
  opts: { unreadOnly?: boolean; limit?: number; cursor?: string } = {},
): Promise<NotificationPage> {
  const qs = new URLSearchParams();
  if (opts.unreadOnly) qs.set('unreadOnly', 'true');
  if (opts.limit)      qs.set('limit', String(opts.limit));
  if (opts.cursor)     qs.set('cursor', opts.cursor);

  const res  = await fetch(`${BASE}?${qs}`, { headers: headers(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load notifications');
  return data as NotificationPage;
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const res  = await fetch(`${BASE}/unread-count`, { headers: headers(token) });
  const data = await res.json();
  if (!res.ok) return 0;
  return (data.count as number) ?? 0;
}

export async function markNotificationRead(token: string, id: string): Promise<NotificationItem> {
  const res  = await fetch(`${BASE}/${id}/read`, { method: 'PATCH', headers: headers(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to mark as read');
  return data as NotificationItem;
}

export async function markAllNotificationsRead(token: string): Promise<{ count: number }> {
  const res  = await fetch(`${BASE}/read-all`, { method: 'POST', headers: headers(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to mark all read');
  return data as { count: number };
}

export async function deleteNotification(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: headers(token) });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? 'Failed to delete notification');
  }
}

/** Returns the SSE stream URL (auth via token query param). */
export function notificationStreamUrl(token: string): string {
  return `${BASE}/stream?token=${encodeURIComponent(token)}`;
}
