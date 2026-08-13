/**
 * NotificationFilters
 *
 * Renders the filter bar on the /notifications page.
 *
 * Controls:
 *  - Read status   : All | Unread
 *  - Category pill : Tasks | Mentions | Projects | Workspace
 *    Each category maps to one or more NotificationType values so users
 *    think in concepts, not internal enum names.
 *  - Type dropdown : fine-grained per-type toggle inside a popover panel
 *  - Active filter pills with individual × dismiss + "Clear all"
 *
 * All filtering is purely client-side — no extra network requests.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SlidersHorizontal, X, ChevronDown,
  CheckSquare, MessageSquare, FolderKanban,
  Building, Users2, Flag, User,
} from 'lucide-react';
import type { NotificationType } from '../types';

// ── Category definitions ──────────────────────────────────────────────────────
// Groups the 10 notification types into 4 user-facing buckets.

export interface NotificationCategory {
  id:    string;
  label: string;
  Icon:  React.ElementType;
  color: string;
  types: NotificationType[];
}

export const CATEGORIES: NotificationCategory[] = [
  {
    id:    'tasks',
    label: 'Tasks',
    Icon:  CheckSquare,
    color: 'text-[#60a5fa]',
    types: ['TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_DUE_SOON'],
  },
  {
    id:    'mentions',
    label: 'Mentions & Comments',
    Icon:  MessageSquare,
    color: 'text-[#facc15]',
    types: ['TASK_MENTIONED', 'TASK_COMMENT_ADDED'],
  },
  {
    id:    'projects',
    label: 'Projects',
    Icon:  FolderKanban,
    color: 'text-[#a78bfa]',
    types: ['PROJECT_MEMBER_ADDED', 'MILESTONE_COMPLETED'],
  },
  {
    id:    'workspace',
    label: 'Workspace & Teams',
    Icon:  Building,
    color: 'text-[#71717a]',
    types: ['WORKSPACE_INVITED', 'MEMBER_ROLE_CHANGED', 'TEAM_MEMBER_ADDED'],
  },
];

// Per-type human labels for the fine-grained dropdown
const TYPE_LABELS: Record<NotificationType, string> = {
  TASK_ASSIGNED:        'Task assigned to you',
  TASK_MENTIONED:       'Mentioned in chat',
  TASK_STATUS_CHANGED:  'Task status changed',
  TASK_COMMENT_ADDED:   'Comment on your task',
  TASK_DUE_SOON:        'Task due soon',
  PROJECT_MEMBER_ADDED: 'Added to project',
  MILESTONE_COMPLETED:  'Milestone completed',
  WORKSPACE_INVITED:    'Workspace invite',
  MEMBER_ROLE_CHANGED:  'Your role changed',
  TEAM_MEMBER_ADDED:    'Added to team',
};

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  TASK_ASSIGNED:        CheckSquare,
  TASK_MENTIONED:       MessageSquare,
  TASK_STATUS_CHANGED:  CheckSquare,
  TASK_COMMENT_ADDED:   MessageSquare,
  TASK_DUE_SOON:        Flag,
  PROJECT_MEMBER_ADDED: FolderKanban,
  MILESTONE_COMPLETED:  Flag,
  WORKSPACE_INVITED:    Building,
  MEMBER_ROLE_CHANGED:  User,
  TEAM_MEMBER_ADDED:    Users2,
};

// ── Filter state ──────────────────────────────────────────────────────────────

export interface NotificationFilterState {
  unreadOnly:    boolean;
  activeTypes:   Set<NotificationType>;  // empty = no type filter (show all)
}

export const DEFAULT_FILTER: NotificationFilterState = {
  unreadOnly:  false,
  activeTypes: new Set(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true when none of the types in a category are active filters. */
function isCategoryActive(cat: NotificationCategory, activeTypes: Set<NotificationType>): boolean {
  return cat.types.every((t) => activeTypes.has(t));
}

function toggleCategory(cat: NotificationCategory, current: Set<NotificationType>): Set<NotificationType> {
  const next = new Set(current);
  const allOn = isCategoryActive(cat, next);
  if (allOn) {
    // Turn off all types in this category
    cat.types.forEach((t) => next.delete(t));
  } else {
    // Turn on all types in this category
    cat.types.forEach((t) => next.add(t));
  }
  return next;
}

function toggleType(type: NotificationType, current: Set<NotificationType>): Set<NotificationType> {
  const next = new Set(current);
  if (next.has(type)) { next.delete(type); } else { next.add(type); }
  return next;
}

// ── Active filter pills ───────────────────────────────────────────────────────

function ActivePills({
  filters,
  onChange,
}: {
  filters: NotificationFilterState;
  onChange: (f: NotificationFilterState) => void;
}) {
  const { activeTypes } = filters;
  if (activeTypes.size === 0) return null;

  // Consolidate into category pills where all types in the category are selected,
  // otherwise show individual type pills
  const pills: { key: string; label: string; Icon: React.ElementType; onRemove: () => void }[] = [];

  const coveredTypes = new Set<NotificationType>();

  for (const cat of CATEGORIES) {
    if (isCategoryActive(cat, activeTypes) && cat.types.every((t) => activeTypes.has(t))) {
      if (cat.types.some((t) => activeTypes.has(t))) {
        pills.push({
          key:      `cat-${cat.id}`,
          label:    cat.label,
          Icon:     cat.Icon,
          onRemove: () => onChange({ ...filters, activeTypes: toggleCategory(cat, activeTypes) }),
        });
        cat.types.forEach((t) => coveredTypes.add(t));
      }
    }
  }

  // Remaining individually-selected types
  for (const type of activeTypes) {
    if (!coveredTypes.has(type)) {
      const Icon = TYPE_ICONS[type];
      pills.push({
        key:      `type-${type}`,
        label:    TYPE_LABELS[type],
        Icon,
        onRemove: () => onChange({ ...filters, activeTypes: toggleType(type, activeTypes) }),
      });
    }
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5 pt-2">
      {pills.map(({ key, label, Icon, onRemove }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/25"
        >
          <Icon className="w-3 h-3" />
          {label}
          <button
            onClick={onRemove}
            className="ml-0.5 p-0.5 rounded-full hover:bg-[#7c3aed]/30 transition-colors"
            aria-label={`Remove ${label} filter`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ ...filters, activeTypes: new Set() })}
        className="text-[11px] text-[#52525b] hover:text-[#fafafa] transition-colors underline underline-offset-2 ml-1"
      >
        Clear all
      </button>
    </div>
  );
}

// ── Filter dropdown panel ─────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onClose,
  anchorRect,
}: {
  filters:    NotificationFilterState;
  onChange:   (f: NotificationFilterState) => void;
  onClose:    () => void;
  anchorRect: DOMRect;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const PANEL_WIDTH = 320;
  const top   = anchorRect.bottom + 8;
  // Align right edge of panel to right edge of button, but clamp so it
  // never goes off the left side of the viewport.
  const right = window.innerWidth - anchorRect.right;
  const clampedRight = Math.max(8, right);

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[200] rounded-xl shadow-2xl overflow-hidden"
      style={{
        top,
        right:           clampedRight,
        width:           PANEL_WIDTH,
        backgroundColor: '#111113',
        border:          '1px solid #27272a',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23]">
        <span className="text-xs font-semibold text-[#fafafa]">Filter notifications</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#27272a] transition-colors">
          <X className="w-3.5 h-3.5 text-[#71717a]" />
        </button>
      </div>

      {/* Read status section */}
      <div className="px-4 py-3 border-b border-[#1f1f23]">
        <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider mb-2">Status</p>
        <div className="flex gap-2">
          {[
            { label: 'All',    value: false },
            { label: 'Unread', value: true  },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => onChange({ ...filters, unreadOnly: value })}
              className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium ${
                filters.unreadOnly === value
                  ? 'bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/30'
                  : 'bg-[#1f1f23] text-[#71717a] border border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category + type section */}
      <div className="px-4 py-3 space-y-4 max-h-80 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider -mb-2">Categories</p>

        {CATEGORIES.map((cat) => {
          const catActive   = isCategoryActive(cat, filters.activeTypes);
          const someActive  = cat.types.some((t) => filters.activeTypes.has(t));

          return (
            <div key={cat.id}>
              {/* Category toggle header */}
              <button
                onClick={() => onChange({ ...filters, activeTypes: toggleCategory(cat, filters.activeTypes) })}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  catActive
                    ? 'bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/25'
                    : someActive
                    ? 'bg-[#1f1f23] text-[#e4e4e7] border border-[#3f3f46]'
                    : 'bg-[#1a1a1d] text-[#71717a] border border-transparent hover:bg-[#1f1f23] hover:text-[#e4e4e7]'
                }`}
              >
                <cat.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cat.color}`} />
                <span className="flex-1 text-left">{cat.label}</span>
                {/* Indeterminate dot when some (not all) types active */}
                {someActive && !catActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] flex-shrink-0" />
                )}
                {catActive && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#7c3aed]/30 text-[#a78bfa]">ON</span>
                )}
              </button>

              {/* Individual types (always visible, no expand needed) */}
              <div className="mt-1 ml-2 space-y-0.5">
                {cat.types.map((type) => {
                  const TypeIcon = TYPE_ICONS[type];
                  const on       = filters.activeTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => onChange({ ...filters, activeTypes: toggleType(type, filters.activeTypes) })}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                        on
                          ? 'bg-[#7c3aed]/10 text-[#c4b5fd]'
                          : 'text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1f1f23]'
                      }`}
                    >
                      {/* Checkbox */}
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                        on ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-[#3f3f46]'
                      }`}>
                        {on && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <TypeIcon className="w-3 h-3 flex-shrink-0" />
                      {TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — reset */}
      {filters.activeTypes.size > 0 && (
        <div className="px-4 py-2.5 border-t border-[#1f1f23]">
          <button
            onClick={() => onChange({ ...filters, activeTypes: new Set() })}
            className="w-full text-xs text-[#71717a] hover:text-[#fafafa] transition-colors py-1"
          >
            Clear type filters
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface NotificationFiltersProps {
  filters:       NotificationFilterState;
  onChange:      (f: NotificationFilterState) => void;
  unreadCount:   number;
}

export function NotificationFilters({ filters, onChange, unreadCount }: NotificationFiltersProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const hasTypeFilter = filters.activeTypes.size > 0;
  const totalActive   = (filters.unreadOnly ? 1 : 0) + filters.activeTypes.size;

  const handleFilterClick = () => {
    if (!panelOpen && btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
    setPanelOpen((o) => !o);
  };

  return (
    <div className="space-y-0">
      {/* Main bar */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Read status pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#1a1a1d] border border-[#27272a]">
          <button
            onClick={() => onChange({ ...filters, unreadOnly: false })}
            className={`text-xs px-3 py-1 rounded-md transition-colors font-medium ${
              !filters.unreadOnly
                ? 'bg-[#27272a] text-[#fafafa] shadow-sm'
                : 'text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onChange({ ...filters, unreadOnly: true })}
            className={`text-xs px-3 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
              filters.unreadOnly
                ? 'bg-[#27272a] text-[#fafafa] shadow-sm'
                : 'text-[#71717a] hover:text-[#a1a1aa]'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-[#7c3aed] text-white min-w-[16px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-[#27272a]" />

        {/* Category quick-filter pills */}
        {CATEGORIES.map((cat) => {
          const active = cat.types.some((t) => filters.activeTypes.has(t));
          return (
            <button
              key={cat.id}
              onClick={() => onChange({ ...filters, activeTypes: toggleCategory(cat, filters.activeTypes) })}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                active
                  ? 'bg-[#7c3aed]/15 text-[#a78bfa] border-[#7c3aed]/30'
                  : 'text-[#71717a] border-[#27272a] hover:text-[#e4e4e7] hover:border-[#3f3f46] bg-transparent'
              }`}
            >
              <cat.Icon className={`w-3 h-3 ${active ? cat.color : ''}`} />
              {cat.label}
            </button>
          );
        })}

        {/* Advanced filter button */}
        <button
          ref={btnRef}
          onClick={handleFilterClick}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ml-auto ${
            panelOpen || hasTypeFilter
              ? 'bg-[#7c3aed]/15 text-[#a78bfa] border-[#7c3aed]/30'
              : 'text-[#71717a] border-[#27272a] hover:text-[#e4e4e7] hover:border-[#3f3f46]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Filter
          {totalActive > 0 && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-[#7c3aed] text-white min-w-[16px] text-center">
              {totalActive}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Active type filter pills */}
      <ActivePills filters={filters} onChange={onChange} />

      {/* Dropdown panel */}
      {panelOpen && anchorRect && (
        <FilterPanel
          filters={filters}
          onChange={onChange}
          onClose={() => setPanelOpen(false)}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}
