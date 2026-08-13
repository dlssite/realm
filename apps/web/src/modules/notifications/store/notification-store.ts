import { API_BASE } from '@/lib/api';
/**
 * Notification Zustand store.
 *
 * Single source of truth for:
 *  - unreadCount   — drives the Bell badge
 *  - items         — the in-memory list (populated on Bell open or page load)
 *  - SSE lifecycle — openStream / closeStream
 *
 * The store is transport-agnostic: the SSE hook calls addIncoming() when a
 * push arrives. If we ever swap SSE for WebSocket, only the hook changes.
 */

import { create } from 'zustand';
import type { NotificationItem } from '../types';
import {
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api/notification-api';

interface NotificationState {
  // Live badge count — updated by SSE and REST
  unreadCount: number;

  // Loaded notification items (for Bell popover and inbox page)
  items:       NotificationItem[];
  hasMore:     boolean;
  nextCursor:  string | null;
  loading:     boolean;
  error:       string | null;

  // SSE stream handle
  _eventSource: EventSource | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Call once on app boot. Opens the SSE stream and loads the initial count. */
  init: (token: string) => void;

  /** Tear down the SSE stream (on logout). */
  destroy: () => void;

  /** Called by the SSE handler when a push notification arrives. */
  addIncoming: (item: NotificationItem) => void;

  /** Load first page of notifications (replaces current list). */
  loadItems: (token: string) => Promise<void>;

  /** Load the next page and append. */
  loadMore: (token: string) => Promise<void>;

  /** Mark one notification read locally + server. */
  markRead: (token: string, id: string) => Promise<void>;

  /** Mark all read locally + server. */
  markAllRead: (token: string) => Promise<void>;

  /** Remove one notification locally + server. */
  remove: (token: string, id: string) => Promise<void>;

  /** Sync unread count from server (SSE reconnect / tab focus). */
  syncCount: (token: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount:  0,
  items:        [],
  hasMore:      false,
  nextCursor:   null,
  loading:      false,
  error:        null,
  _eventSource: null,

  // ── init ──────────────────────────────────────────────────────────────────
  init(token) {
    // Avoid double-connecting
    if (get()._eventSource) return;

    const url = `${API_BASE}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);

    // Server sends `connected` event with initial unread count
    es.addEventListener('connected', (e) => {
      try {
        const { unreadCount } = JSON.parse((e as MessageEvent).data);
        set({ unreadCount });
      } catch { /* ignore malformed */ }
    });

    // Server sends `notification` event for each new push
    es.addEventListener('notification', (e) => {
      try {
        const item = JSON.parse((e as MessageEvent).data) as NotificationItem;
        get().addIncoming(item);
      } catch { /* ignore malformed */ }
    });

    // Server sends `read_all` when another tab calls mark-all-read
    es.addEventListener('read_all', () => {
      set((s) => ({
        unreadCount: 0,
        items: s.items.map((n) => ({ ...n, isRead: true })),
      }));
    });

    es.onerror = () => {
      // EventSource auto-reconnects — just sync the count when it comes back
      es.addEventListener('connected', (e) => {
        try {
          const { unreadCount } = JSON.parse((e as MessageEvent).data);
          set({ unreadCount });
        } catch { /* ignore */ }
      }, { once: true });
    };

    set({ _eventSource: es });
  },

  // ── destroy ───────────────────────────────────────────────────────────────
  destroy() {
    get()._eventSource?.close();
    set({ _eventSource: null, unreadCount: 0, items: [], nextCursor: null });
  },

  // ── addIncoming ───────────────────────────────────────────────────────────
  addIncoming(item) {
    set((s) => ({
      unreadCount: s.unreadCount + 1,
      // Prepend to the in-memory list only if items are already loaded
      items: s.items.length > 0 ? [item, ...s.items] : s.items,
    }));
  },

  // ── loadItems ─────────────────────────────────────────────────────────────
  async loadItems(token) {
    set({ loading: true, error: null });
    try {
      const { listNotifications } = await import('../api/notification-api');
      const page = await listNotifications(token, { limit: 30 });
      set({
        items:      page.items,
        hasMore:    page.hasNextPage,
        nextCursor: page.nextCursor,
        loading:    false,
      });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
    }
  },

  // ── loadMore ──────────────────────────────────────────────────────────────
  async loadMore(token) {
    const { nextCursor, hasMore, loading } = get();
    if (!hasMore || loading || !nextCursor) return;

    set({ loading: true });
    try {
      const { listNotifications } = await import('../api/notification-api');
      const page = await listNotifications(token, { limit: 30, cursor: nextCursor });
      set((s) => ({
        items:      [...s.items, ...page.items],
        hasMore:    page.hasNextPage,
        nextCursor: page.nextCursor,
        loading:    false,
      }));
    } catch {
      set({ loading: false });
    }
  },

  // ── markRead ──────────────────────────────────────────────────────────────
  async markRead(token, id) {
    // Optimistic update
    set((s) => {
      const wasUnread = s.items.find((n) => n.id === id && !n.isRead);
      return {
        items:      s.items.map((n) => n.id === id ? { ...n, isRead: true } : n),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    });
    try {
      await markNotificationRead(token, id);
    } catch {
      // Revert on failure
      set((s) => ({
        items:      s.items.map((n) => n.id === id ? { ...n, isRead: false } : n),
        unreadCount: s.unreadCount + 1,
      }));
    }
  },

  // ── markAllRead ───────────────────────────────────────────────────────────
  async markAllRead(token) {
    set((s) => ({
      unreadCount: 0,
      items: s.items.map((n) => ({ ...n, isRead: true })),
    }));
    try {
      await markAllNotificationsRead(token);
    } catch { /* best-effort */ }
  },

  // ── remove ────────────────────────────────────────────────────────────────
  async remove(token, id) {
    const target = get().items.find((n) => n.id === id);
    set((s) => ({
      items:      s.items.filter((n) => n.id !== id),
      unreadCount: target && !target.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }));
    try {
      await deleteNotification(token, id);
    } catch { /* best-effort */ }
  },

  // ── syncCount ─────────────────────────────────────────────────────────────
  async syncCount(token) {
    try {
      const count = await fetchUnreadCount(token);
      set({ unreadCount: count });
    } catch { /* ignore */ }
  },
}));
