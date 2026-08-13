/**
 * NotificationBell — topbar Bell icon with unread badge + popover list.
 *
 * Shows the last 10 notifications grouped Today / Earlier.
 * Clicking an item marks it read. "View all" links to /notifications.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCheck, X, CheckSquare, FolderKanban,
  MessageSquare, User, Flag, Building, Users2,
} from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useNotificationStore } from '../store/notification-store';
import type { NotificationItem, NotificationType } from '../types';

// ── Icon & colour mapping by notification type ───────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { Icon: React.ElementType; color: string; bg: string }> = {
  TASK_ASSIGNED:        { Icon: CheckSquare,   color: 'text-[#60a5fa]', bg: 'bg-[#60a5fa]/10' },
  TASK_MENTIONED:       { Icon: MessageSquare, color: 'text-[#facc15]', bg: 'bg-[#facc15]/10' },
  TASK_STATUS_CHANGED:  { Icon: CheckSquare,   color: 'text-[#34d399]', bg: 'bg-[#34d399]/10' },
  TASK_COMMENT_ADDED:   { Icon: MessageSquare, color: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/10' },
  TASK_DUE_SOON:        { Icon: Flag,          color: 'text-[#fb923c]', bg: 'bg-[#fb923c]/10' },
  PROJECT_MEMBER_ADDED: { Icon: FolderKanban,  color: 'text-[#a78bfa]', bg: 'bg-[#a78bfa]/10' },
  MILESTONE_COMPLETED:  { Icon: Flag,          color: 'text-[#34d399]', bg: 'bg-[#34d399]/10' },
  WORKSPACE_INVITED:    { Icon: Building,      color: 'text-[#71717a]', bg: 'bg-[#71717a]/10' },
  MEMBER_ROLE_CHANGED:  { Icon: User,          color: 'text-[#94a3b8]', bg: 'bg-[#94a3b8]/10' },
  TEAM_MEMBER_ADDED:    { Icon: Users2,        color: 'text-[#818cf8]', bg: 'bg-[#818cf8]/10' },
};

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

function isToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

// ── Single notification row ───────────────────────────────────────────────────

function NotifRow({
  item, token, onClose,
}: {
  item: NotificationItem;
  token: string;
  onClose: () => void;
}) {
  const markRead = useNotificationStore((s) => s.markRead);
  const remove   = useNotificationStore((s) => s.remove);
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.TASK_ASSIGNED;

  const handleClick = () => {
    if (!item.isRead) markRead(token, item.id);
    onClose();
  };

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3 hover:bg-[#1f1f23] transition-colors cursor-pointer ${
        !item.isRead ? 'bg-[#18181b]' : ''
      }`}
      onClick={handleClick}
    >
      {/* Unread dot */}
      {!item.isRead && (
        <span className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-[#7c3aed]" />
      )}

      {/* Type icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${cfg.bg}`}>
        <cfg.Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-snug ${item.isRead ? 'text-[#a1a1aa]' : 'text-[#e4e4e7]'}`}>
          {item.title}
        </p>
        {item.body && (
          <p className="text-[11px] text-[#52525b] mt-0.5 truncate">{item.body}</p>
        )}
        <p className="text-[10px] text-[#3f3f46] mt-1">{relativeTime(item.createdAt)}</p>
      </div>

      {/* Dismiss button (shown on hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); remove(token, item.id); }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#27272a] transition-all"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3 text-[#52525b]" />
      </button>
    </div>
  );
}

// ── Bell + popover ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const popRef   = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const items       = useNotificationStore((s) => s.items);
  const loading     = useNotificationStore((s) => s.loading);
  const loadItems   = useNotificationStore((s) => s.loadItems);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  // Load notifications when popover opens
  const handleOpen = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(true);
    if (token && items.length === 0) loadItems(token);
  }, [token, items.length, loadItems]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current  && !popRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const todayItems    = items.filter((n) =>  isToday(n.createdAt)).slice(0, 10);
  const earlierItems  = items.filter((n) => !isToday(n.createdAt)).slice(0, 10);
  const displayItems  = [...todayItems, ...earlierItems].slice(0, 10);
  const badge         = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative p-2 rounded-lg hover:bg-[#1f1f23] transition-colors"
        aria-label={`Notifications${badge ? ` (${badge} unread)` : ''}`}
      >
        <Bell className={`w-4 h-4 ${badge ? 'text-[#fafafa]' : 'text-[#71717a]'}`} />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#7c3aed] rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
            {badge}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="fixed z-[300] w-80 rounded-xl shadow-2xl overflow-hidden"
          style={{
            top:   pos.top,
            right: pos.right,
            backgroundColor: '#111113',
            border: '1px solid #27272a',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#fafafa]">Notifications</span>
              {badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#7c3aed]/20 text-[#a78bfa]">
                  {badge} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && token && (
              <button
                onClick={() => markAllRead(token)}
                className="flex items-center gap-1 text-[11px] text-[#71717a] hover:text-[#fafafa] transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[#1a1a1d]">
            {loading && items.length === 0 && (
              <div className="space-y-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[#27272a] flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className="h-2.5 bg-[#27272a] rounded w-4/5" />
                      <div className="h-2 bg-[#1f1f23] rounded w-2/5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && displayItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#1f1f23] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#3f3f46]" />
                </div>
                <p className="text-xs text-[#52525b]">You're all caught up</p>
              </div>
            )}

            {/* Today group */}
            {todayItems.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[#0c0c0e]">
                  <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Today</span>
                </div>
                {todayItems.map((n) => (
                  <NotifRow key={n.id} item={n} token={token!} onClose={() => setOpen(false)} />
                ))}
              </>
            )}

            {/* Earlier group */}
            {earlierItems.slice(0, 10 - todayItems.length).length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-[#0c0c0e]">
                  <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider">Earlier</span>
                </div>
                {earlierItems.slice(0, 10 - todayItems.length).map((n) => (
                  <NotifRow key={n.id} item={n} token={token!} onClose={() => setOpen(false)} />
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#1f1f23] px-4 py-2.5">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-[#71717a] hover:text-[#fafafa] transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
