/**
 * user-profile-card.constants.ts
 * Design-system color maps used by the UserProfileCard sub-components.
 */

import { WorkspaceRole, TaskStatus, TaskPriority } from '@realm/types';

export const ROLE_BADGE: Record<WorkspaceRole, { label: string; cls: string }> = {
  OWNER:   { label: 'Owner',   cls: 'bg-[#2d1f3d] text-[#a78bfa] border border-[#4c2889]' },
  ADMIN:   { label: 'Admin',   cls: 'bg-[#1e2d3d] text-[#60a5fa] border border-[#1e4d7d]' },
  MANAGER: { label: 'Manager', cls: 'bg-[#1e3028] text-[#34d399] border border-[#1a5040]' },
  MEMBER:  { label: 'Member',  cls: 'bg-[#1f1f23] text-[#e4e4e7] border border-[#2a2a2e]' },
  GUEST:   { label: 'Guest',   cls: 'bg-[#2a2010] text-[#fbbf24] border border-[#4a3a1a]' },
};

// @realm/types TaskStatus values are lowercase
export const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; text: string }> = {
  backlog:     { label: 'Backlog',     dot: 'bg-[#52525b]', text: 'text-[#71717a]' },
  todo:        { label: 'Todo',        dot: 'bg-[#60a5fa]', text: 'text-[#60a5fa]' },
  in_progress: { label: 'In Progress', dot: 'bg-[#a78bfa]', text: 'text-[#a78bfa]' },
  in_review:   { label: 'In Review',   dot: 'bg-[#fbbf24]', text: 'text-[#fbbf24]' },
  done:        { label: 'Done',        dot: 'bg-[#34d399]', text: 'text-[#34d399]' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-[#f87171]', text: 'text-[#f87171]' },
};

// @realm/types TaskPriority values are lowercase
export const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: 'bg-[#ef4444]',
  high:   'bg-[#f97316]',
  medium: 'bg-[#eab308]',
  low:    'bg-[#60a5fa]',
  none:   'bg-[#52525b]',
};

export const PROJECT_STATUS_DOT: Record<string, string> = {
  ACTIVE:    'bg-[#34d399]',
  PLANNED:   'bg-[#60a5fa]',
  PAUSED:    'bg-[#fbbf24]',
  COMPLETED: 'bg-[#a78bfa]',
  CANCELLED: 'bg-[#f87171]',
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active', PLANNED: 'Planned', PAUSED: 'Paused',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export const PROJECT_STATUS_TEXT: Record<string, string> = {
  ACTIVE: 'text-[#34d399]', PLANNED: 'text-[#60a5fa]', PAUSED: 'text-[#fbbf24]',
  COMPLETED: 'text-[#a78bfa]', CANCELLED: 'text-[#f87171]',
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled',
];
