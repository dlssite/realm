/**
 * ActivityItem — renders a single audit log entry.
 * Shows actor avatar, a human-readable sentence, entity badge, and timestamp.
 */

import React from 'react';
import {
  CheckSquare, FolderKanban, BookOpen, MessageSquare,
  Folder, Building, Users2, User, Flag, Upload,
  AtSign, Pencil, Trash2, RotateCcw, ArrowRight,
  Plus, CircleDot,
} from 'lucide-react';
import type { ActivityEvent, AuditEntityType, AuditAction } from '../types';

// ── Entity badge config ───────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<AuditEntityType, { label: string; Icon: React.ElementType; color: string }> = {
  TASK:      { label: 'Task',      Icon: CheckSquare,   color: 'text-[#60a5fa] bg-[#60a5fa]/10 border-[#60a5fa]/20' },
  PROJECT:   { label: 'Project',   Icon: FolderKanban,  color: 'text-[#a78bfa] bg-[#a78bfa]/10 border-[#a78bfa]/20' },
  MILESTONE: { label: 'Milestone', Icon: Flag,          color: 'text-[#fb923c] bg-[#fb923c]/10 border-[#fb923c]/20' },
  WIKI_PAGE: { label: 'Wiki',      Icon: BookOpen,      color: 'text-[#34d399] bg-[#34d399]/10 border-[#34d399]/20' },
  COMMENT:   { label: 'Comment',   Icon: MessageSquare, color: 'text-[#facc15] bg-[#facc15]/10 border-[#facc15]/20' },
  CHANNEL:   { label: 'Channel',   Icon: MessageSquare, color: 'text-[#f472b6] bg-[#f472b6]/10 border-[#f472b6]/20' },
  FILE:      { label: 'File',      Icon: Folder,        color: 'text-[#fb923c] bg-[#fb923c]/10 border-[#fb923c]/20' },
  WORKSPACE: { label: 'Workspace', Icon: Building,      color: 'text-[#71717a] bg-[#71717a]/10 border-[#71717a]/20' },
  TEAM:      { label: 'Team',      Icon: Users2,        color: 'text-[#818cf8] bg-[#818cf8]/10 border-[#818cf8]/20' },
  MEMBER:    { label: 'Member',    Icon: User,          color: 'text-[#94a3b8] bg-[#94a3b8]/10 border-[#94a3b8]/20' },
};

// ── Action icon config ────────────────────────────────────────────────────────

const ACTION_ICON: Record<AuditAction, React.ElementType> = {
  CREATED:          Plus,
  UPDATED:          Pencil,
  DELETED:          Trash2,
  COMMENTED:        MessageSquare,
  ASSIGNED:         User,
  STATUS_CHANGED:   CircleDot,
  PRIORITY_CHANGED: Flag,
  MOVED:            ArrowRight,
  RESTORED:         RotateCcw,
  UPLOADED:         Upload,
  MENTIONED:        AtSign,
};

// ── Human-readable sentence builder ──────────────────────────────────────────

function buildSentence(event: ActivityEvent): string {
  const { action, entityType, entityTitle, meta } = event;
  const entity = ENTITY_CONFIG[entityType]?.label ?? entityType;
  const title  = entityTitle ? `"${entityTitle}"` : entity.toLowerCase();

  switch (action) {
    case 'CREATED':          return `created ${entity.toLowerCase()} ${title}`;
    case 'UPDATED':          return `updated ${entity.toLowerCase()} ${title}`;
    case 'DELETED':          return `deleted ${entity.toLowerCase()} ${title}`;
    case 'RESTORED':         return `restored ${entity.toLowerCase()} ${title}`;
    case 'COMMENTED':        return `commented on ${entity.toLowerCase()} ${title}`;
    case 'MENTIONED':        return `mentioned someone in ${entity.toLowerCase()} ${title}`;
    case 'UPLOADED':         return `uploaded file ${title}`;
    case 'ASSIGNED': {
      const to = (meta?.to as string) ?? 'someone';
      return `assigned ${entity.toLowerCase()} ${title} to ${to}`;
    }
    case 'STATUS_CHANGED': {
      const from = (meta?.from as string) ?? '—';
      const to   = (meta?.to   as string) ?? '—';
      return `changed status of ${title} from ${from} → ${to}`;
    }
    case 'PRIORITY_CHANGED': {
      const from = (meta?.from as string) ?? '—';
      const to   = (meta?.to   as string) ?? '—';
      return `changed priority of ${title} from ${from} → ${to}`;
    }
    case 'MOVED': {
      const to = (meta?.to as string) ?? 'another project';
      return `moved ${entity.toLowerCase()} ${title} to ${to}`;
    }
    default:
      return `performed ${(action as string).toLowerCase().replace(/_/g, ' ')} on ${title}`;
  }
}

// ── Relative timestamp ────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ActivityItemProps {
  event: ActivityEvent;
}

export function ActivityItem({ event }: ActivityItemProps) {
  const entityCfg = ENTITY_CONFIG[event.entityType];
  const ActionIcon = ACTION_ICON[event.action] ?? Pencil;

  return (
    <div className="flex items-start gap-3 py-3 group">
      {/* Actor avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        {event.actor.avatarUrl ? (
          <img
            src={event.actor.avatarUrl}
            alt={event.actor.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-[#27272a]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center text-xs font-bold text-white ring-1 ring-[#27272a]">
            {event.actor.name[0]?.toUpperCase()}
          </div>
        )}
        {/* Action icon badge */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#1f1f23] border border-[#27272a] flex items-center justify-center">
          <ActionIcon className="w-2.5 h-2.5 text-[#71717a]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e4e4e7] leading-snug">
          <span className="font-semibold text-[#fafafa]">{event.actor.name}</span>
          {' '}
          <span className="text-[#a1a1aa]">{buildSentence(event)}</span>
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          {/* Entity type badge */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${entityCfg?.color ?? ''}`}>
            {entityCfg && <entityCfg.Icon className="w-2.5 h-2.5" />}
            {entityCfg?.label ?? event.entityType}
          </span>

          {/* Timestamp */}
          <span className="text-[11px] text-[#52525b]" title={new Date(event.createdAt).toLocaleString()}>
            {relativeTime(event.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
