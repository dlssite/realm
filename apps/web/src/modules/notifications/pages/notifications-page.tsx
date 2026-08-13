/**
 * NotificationsPage — full inbox at /notifications.
 *
 * Features:
 *  - Infinite scroll (cursor-based, 30 per page)
 *  - Filter: All / Unread + category quick pills + fine-grained type panel
 *  - Mark all read, dismiss individual
 *  - Grouped by Today / Yesterday / older dates
 *  - Empty state, loading skeleton, error+retry
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Bell, CheckCheck, RefreshCw, X, CheckSquare,
  FolderKanban, MessageSquare, User, Flag, Building, Users2,
} from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useNotificationStore } from '../store/notification-store';
import {
  NotificationFilters,
  DEFAULT_FILTER,
  type NotificationFilterState,
} from '../components/notification-filters';
import { useFilterState } from '../hooks/use-filter-state';
import type { NotificationItem, NotificationType } from '../types';

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { Icon: React.ElementType; color: string; bg: string; label: string }> = {
  TASK_ASSIGNED:        { Icon: CheckSquare,   color: 'text-[#60a5fa]', bg: 'bg-[#60a5fa]/10', label: 'Task assigned'      },
  TASK_MENTIONED:       { Icon: MessageSquare, color: 'text-[#facc15]', bg: 'bg-[#facc15]/10', label: 'Mentioned'           },
  TASK_STATUS_CHANGED:  { Icon: CheckSquare,   color: 'text-[#34d399]', bg: 'bg-[#34d399]/10', label: 'Status changed'      },
  TASK_COMMENT_ADDED:   { Icon: MessageSquare, color: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/10', label: 'New comment'         },
  TASK_DUE_SOON:        { Icon: Flag,          color: 'text-[#fb923c]', bg: 'bg-[#fb923c]/10', label: 'Due soon'            },
  PROJECT_MEMBER_ADDED: { Icon: FolderKanban,  color: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/10', label: 'Added to project'   },
  MILESTONE_COMPLETED:  { Icon: Flag,          color: 'text-[#34d399]', bg: 'bg-[#34d399]/10', label: 'Milestone completed' },
  WORKSPACE_INVITED:    { Icon: Building,      color: 'text-[#71717a]', bg: 'bg-[#71717a]/10', label: 'Workspace invite'    },
  MEMBER_ROLE_CHANGED:  { Icon: User,          color: 'text-[#94a3b8]', bg: 'bg-[#94a3b8]/10', label: 'Role changed'        },
  TEAM_MEMBER_ADDED:    { Icon: Users2,        color: 'text-[#818cf8]', bg: 'bg-[#818cf8]/10', label: 'Added to team'       },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayLabel(iso: string): string {
  const date      = new Date(iso);
  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(date, today))     return 'Today';
  if (same(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDay(items: NotificationItem[]) {
  const map = new Map<string, NotificationItem[]>();
  for (const item of items) {
    const label = dayLabel(item.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function applyFilters(items: NotificationItem[], f: NotificationFilterState): NotificationItem[] {
  let result = items;
  if (f.unreadOnly)        result = result.filter((n) => !n.isRead);
  if (f.activeTypes.size)  result = result.filter((n) => f.activeTypes.has(n.type));
  return result;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="divide-y divide-[#1f1f23]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 py-4 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-[#27272a] flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 bg-[#27272a] rounded w-3/4" />
            <div className="h-2.5 bg-[#1f1f23] rounded w-1/2" />
            <div className="h-2 bg-[#1f1f23] rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function NotifRow({ item, token }: { item: NotificationItem; token: string }) {
  const markRead = useNotificationStore((s) => s.markRead);
  const remove   = useNotificationStore((s) => s.remove);
  const cfg      = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.TASK_ASSIGNED;

  return (
    <div
      className={`group relative flex items-start gap-4 py-4 cursor-pointer hover:bg-[#111113] rounded-lg px-3 transition-colors ${
        !item.isRead ? 'bg-[#111113]' : ''
      }`}
      onClick={() => { if (!item.isRead) markRead(token, item.id); }}
    >
      {!item.isRead && (
        <span className="absolute left-0.5 top-5 w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
      )}

      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5 ${cfg.bg}`}>
        <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${item.isRead ? 'text-[#a1a1aa]' : 'text-[#e4e4e7] font-medium'}`}>
            {item.title}
          </p>
          <span className="flex-shrink-0 text-[11px] text-[#52525b]" title={new Date(item.createdAt).toLocaleString()}>
            {relativeTime(item.createdAt)}
          </span>
        </div>

        {item.body && (
          <p className="text-xs text-[#71717a] mt-0.5 line-clamp-2">{item.body}</p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} border-current/20`}>
            {cfg.label}
          </span>
          {item.entityTitle && (
            <span className="text-[11px] text-[#52525b] truncate max-w-[200px]">{item.entityTitle}</span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead(token, item.id); }}
            className="p-1.5 rounded-md hover:bg-[#27272a] transition-colors"
            title="Mark as read"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#71717a]" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); remove(token, item.id); }}
          className="p-1.5 rounded-md hover:bg-[#27272a] transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-[#71717a]" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { token }             = useAuthStore();
  const store                 = useNotificationStore();
  const [filters, setFilters] = useFilterState(DEFAULT_FILTER);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(() => {
    if (token) store.loadItems(token);
  }, [token, store]);

  useEffect(() => { reload(); }, [reload]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !store.hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && token) store.loadMore(token); },
      { threshold: 0.1 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [store.hasMore, store.loadMore, token]);

  const displayed = applyFilters(store.items, filters);
  const groups    = groupByDay(displayed);
  const isFiltered = filters.unreadOnly || filters.activeTypes.size > 0;

  return (
    <div className="space-y-0 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1f1f23]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#7c3aed] font-medium mb-1">
            <Bell className="w-3.5 h-3.5" />
            <span>Personal Inbox</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">Notifications</h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Alerts directed at you — assignments, mentions, and activity on your tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {store.unreadCount > 0 && token && (
            <button
              onClick={() => store.markAllRead(token)}
              className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#fafafa] px-3 py-1.5 rounded-lg border border-[#27272a] hover:border-[#3f3f46] bg-[#18181b] hover:bg-[#1f1f23] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={reload}
            disabled={store.loading}
            className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#fafafa] px-3 py-1.5 rounded-lg border border-[#27272a] hover:border-[#3f3f46] bg-[#18181b] hover:bg-[#1f1f23] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${store.loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="py-3 border-b border-[#1f1f23]">
        <NotificationFilters
          filters={filters}
          onChange={setFilters}
          unreadCount={store.unreadCount}
        />
      </div>

      {/* ── Feed ────────────────────────────────────────────────────────── */}
      <div className="mt-2">

        {store.error && !store.loading && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 mt-4">
            <span>{store.error}</span>
            <button onClick={reload} className="text-xs underline underline-offset-2 hover:text-red-300 ml-3 flex-shrink-0">
              Retry
            </button>
          </div>
        )}

        {store.loading && store.items.length === 0 && <Skeleton />}

        {!store.loading && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-[#7c3aed]" />
            </div>
            <p className="text-sm font-medium text-[#e4e4e7]">
              {isFiltered ? 'No notifications match your filters' : 'No notifications yet'}
            </p>
            <p className="text-xs text-[#52525b] mt-1 max-w-xs">
              {isFiltered
                ? "Try adjusting or clearing your filters to see more."
                : "When teammates assign you tasks, mention you, or comment on your work, it'll show up here."}
            </p>
            {isFiltered && (
              <button
                onClick={() => setFilters(DEFAULT_FILTER)}
                className="mt-4 text-xs text-[#a78bfa] hover:text-[#7c3aed] underline underline-offset-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {displayed.length > 0 && (
          <div>
            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 py-3 sticky top-0 bg-[#09090b] z-10">
                  <span className="text-xs font-semibold text-[#52525b] uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-[#1f1f23]" />
                  <span className="text-[10px] text-[#3f3f46] tabular-nums">
                    {group.items.filter((n) => !n.isRead).length > 0
                      ? `${group.items.filter((n) => !n.isRead).length} unread`
                      : `${group.items.length} read`}
                  </span>
                </div>

                <div className="space-y-0">
                  {group.items.map((n) => (
                    <NotifRow key={n.id} item={n} token={token!} />
                  ))}
                </div>
              </div>
            ))}

            <div ref={sentinelRef} className="h-8" />

            {store.loading && store.items.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 border-2 border-[#3f3f46] border-t-[#7c3aed] rounded-full animate-spin" />
              </div>
            )}

            {!store.hasMore && displayed.length > 0 && (
              <p className="text-center text-[10px] text-[#3f3f46] py-6 uppercase tracking-wider">
                {"You're all caught up"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
