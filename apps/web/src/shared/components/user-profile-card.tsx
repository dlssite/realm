/**
 * UserProfileCard — modular profile card component.
 *
 * Sub-components exposed as static properties:
 *   UserProfileCard.Header   — avatar · name · email · role badge · join date
 *   UserProfileCard.Stats    — task-count pills by status
 *   UserProfileCard.Teams    — team chips with leader crown
 *   UserProfileCard.Projects — top-2 projects with status dot + "+N more"
 *   UserProfileCard.Tasks    — active task list (up to 5)
 */

import React from 'react';
import {
  Crown,
  Briefcase,
  CheckSquare,
  Users,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { UserProfileCardData, WorkspaceRole, TaskStatus, TaskPriority } from '@realm/types';

// ── Design-system constants ───────────────────────────────────────────────────

const ROLE_BADGE: Record<WorkspaceRole, { label: string; cls: string }> = {
  OWNER:   { label: 'Owner',   cls: 'bg-[#2d1f3d] text-[#a78bfa] border border-[#4c2889]' },
  ADMIN:   { label: 'Admin',   cls: 'bg-[#1e2d3d] text-[#60a5fa] border border-[#1e4d7d]' },
  MANAGER: { label: 'Manager', cls: 'bg-[#1e3028] text-[#34d399] border border-[#1a5040]' },
  MEMBER:  { label: 'Member',  cls: 'bg-[#1f1f23] text-[#e4e4e7] border border-[#2a2a2e]' },
  GUEST:   { label: 'Guest',   cls: 'bg-[#2a2010] text-[#fbbf24] border border-[#4a3a1a]' },
};

// TaskStatus and TaskPriority use lowercase values in @realm/types
const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string; text: string }> = {
  backlog:     { label: 'Backlog',     dot: 'bg-[#52525b]', text: 'text-[#71717a]' },
  todo:        { label: 'Todo',        dot: 'bg-[#60a5fa]', text: 'text-[#60a5fa]' },
  in_progress: { label: 'In Progress', dot: 'bg-[#a78bfa]', text: 'text-[#a78bfa]' },
  in_review:   { label: 'In Review',   dot: 'bg-[#fbbf24]', text: 'text-[#fbbf24]' },
  done:        { label: 'Done',        dot: 'bg-[#34d399]', text: 'text-[#34d399]' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-[#f87171]', text: 'text-[#f87171]' },
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: 'bg-[#ef4444]',
  high:   'bg-[#f97316]',
  medium: 'bg-[#eab308]',
  low:    'bg-[#60a5fa]',
  none:   'bg-[#52525b]',
};

const PROJECT_STATUS_DOT: Record<string, string> = {
  ACTIVE:    'bg-[#34d399]',
  PLANNED:   'bg-[#60a5fa]',
  PAUSED:    'bg-[#fbbf24]',
  COMPLETED: 'bg-[#a78bfa]',
  CANCELLED: 'bg-[#f87171]',
};

// ── Shared skeleton ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1f1f23] rounded ${className}`} />;
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="w-3 h-3 text-[#52525b]" />
      <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = 'lg',
}: {
  name: string;
  avatarUrl?: string | null | undefined;
  size?: 'sm' | 'lg';
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const dim = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-8 h-8 text-sm';

  return (
    <div
      className={`${dim} rounded-full flex-shrink-0 flex items-center justify-center
        font-bold overflow-hidden select-none
        bg-gradient-to-br from-[#7c3aed] to-[#4f1d96] text-white`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ data }: { data: UserProfileCardData }) {
  const badge    = ROLE_BADGE[data.workspaceRole] ?? ROLE_BADGE.MEMBER;
  const joinDate = new Date(data.joinedAt);
  const joinMonth = joinDate.toLocaleString([], { month: 'short' });
  const joinYear  = joinDate.getFullYear();

  return (
    <div className="flex items-start gap-3 px-4 pt-4 pb-3">
      <Avatar name={data.user.name} avatarUrl={data.user.avatarUrl} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#fafafa] leading-tight truncate">
          {data.user.name}
        </p>
        <p className="text-[11px] text-[#71717a] leading-none mt-0.5 truncate">
          {data.user.email}
        </p>
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full leading-none ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] text-[#52525b]">
            <Calendar className="w-2.5 h-2.5" />
            Joined {joinMonth} {joinYear}
          </span>
        </div>
      </div>
    </div>
  );
}

function Stats({ data }: { data: UserProfileCardData }) {
  const statusOrder: TaskStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done', 'cancelled'];
  const entries = statusOrder
    .map((s) => ({ status: s, count: data.taskCounts[s] ?? 0 }))
    .filter((e) => e.count > 0);

  if (entries.length === 0) return null;

  return (
    <div className="px-4 pb-3">
      <SectionHeading icon={CheckSquare} label="Tasks" />
      <div className="flex flex-wrap gap-1.5">
        {entries.map(({ status, count }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <span
              key={status}
              className="inline-flex items-center gap-1 text-[9px] font-medium
                bg-[#141417] border border-[#27272a] rounded-full px-2 py-0.5"
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className="text-[#a1a1aa]">{cfg.label}</span>
              <span className="text-[#fafafa] font-semibold">{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Teams({ data }: { data: UserProfileCardData }) {
  if (data.teams.length === 0) return null;

  return (
    <div className="px-4 pb-3">
      <SectionHeading icon={Users} label="Teams" />
      <div className="flex flex-wrap gap-1.5">
        {data.teams.map((team) => (
          <span
            key={team.id}
            className="inline-flex items-center gap-1 text-[10px]
              bg-[#141417] border border-[#27272a] hover:border-[#3f3f46]
              rounded-md px-2 py-1 text-[#a1a1aa] transition-colors"
          >
            {team.isLeader && <Crown className="w-2.5 h-2.5 text-[#fbbf24] flex-shrink-0" />}
            {team.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function Projects({ data }: { data: UserProfileCardData }) {
  const PROJECT_STATUS_LABEL: Record<string, string> = {
    ACTIVE: 'Active', PLANNED: 'Planned', PAUSED: 'Paused',
    COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  };
  const PROJECT_STATUS_TEXT: Record<string, string> = {
    ACTIVE: 'text-[#34d399]', PLANNED: 'text-[#60a5fa]', PAUSED: 'text-[#fbbf24]',
    COMPLETED: 'text-[#a78bfa]', CANCELLED: 'text-[#f87171]',
  };

  const remaining = (data.totalProjects ?? data.projects.length) - data.projects.length;

  return (
    <div className="px-4 pb-3">
      <SectionHeading icon={Briefcase} label="Projects" />
      {data.projects.length === 0 ? (
        <p className="text-[10px] text-[#52525b] italic">No active projects.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            {data.projects.map((proj) => (
              <div
                key={proj.id}
                className="flex items-start gap-2 bg-[#141417] border border-[#27272a]
                  hover:border-[#3f3f46] rounded-md px-2.5 py-1.5 transition-colors"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[3px]
                    ${PROJECT_STATUS_DOT[proj.status] ?? 'bg-[#52525b]'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#e4e4e7] font-medium leading-snug truncate">
                    {proj.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[#52525b] font-mono flex-shrink-0">
                      {proj.identifier}
                    </span>
                    <span className={`text-[9px] flex-shrink-0 ${PROJECT_STATUS_TEXT[proj.status] ?? 'text-[#71717a]'}`}>
                      {PROJECT_STATUS_LABEL[proj.status] ?? proj.status}
                    </span>
                    {proj.role === 'LEAD' && (
                      <span className="text-[9px] font-semibold text-[#a78bfa] flex-shrink-0">
                        Lead
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {remaining > 0 && (
            <p className="text-[9px] text-[#52525b] mt-1.5 pl-0.5">
              +{remaining} more project{remaining > 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Tasks({ data }: { data: UserProfileCardData }) {
  if (data.assignedTasks.length === 0) return null;

  return (
    <div className="px-4 pb-3">
      <SectionHeading icon={CheckSquare} label="Active Tasks" />
      <div className="flex flex-col gap-1">
        {data.assignedTasks.map((task) => {
          const statusCfg   = STATUS_CONFIG[task.status];
          const priorityDot = PRIORITY_DOT[task.priority];
          const isOverdue   = task.dueDate != null && new Date(task.dueDate) < new Date();

          return (
            <div
              key={task.id}
              className="flex items-start gap-2 bg-[#141417] border border-[#27272a]
                hover:border-[#3f3f46] rounded-md px-2.5 py-1.5 transition-colors"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${priorityDot}`}
                title={task.priority}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#e4e4e7] leading-snug truncate">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-[#52525b] font-mono">{task.identifier}</span>
                  <span className={`text-[9px] ${statusCfg.text}`}>{statusCfg.label}</span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-[#f87171]">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-4 pb-3 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/2" />
          <Skeleton className="h-4 w-16 rounded-full mt-1" />
        </div>
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-2 w-12" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2 w-14" />
        <Skeleton className="h-8 rounded-md" />
        <Skeleton className="h-8 rounded-md" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
      <AlertCircle className="w-6 h-6 text-[#f87171]" />
      <p className="text-xs text-[#71717a]">{message}</p>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-[#1f1f23]" />;
}

// ── Root card ─────────────────────────────────────────────────────────────────

export interface UserProfileCardProps {
  data?: UserProfileCardData | null;
  isLoading?: boolean;
  error?: string | null;
  profileHref?: string | undefined;
  children?: React.ReactNode;
}

function UserProfileCardRoot({
  data,
  isLoading,
  error,
  profileHref,
  children,
}: UserProfileCardProps) {
  return (
    <div
      className="w-72 bg-[#0c0c0e] border border-[#27272a] rounded-xl
        shadow-2xl shadow-black/60 overflow-hidden
        animate-in fade-in zoom-in-95 duration-150"
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : data ? (
        <>
          <Header data={data} />

          {Object.keys(data.taskCounts).length > 0 && (
            <><Divider /><Stats data={data} /></>
          )}

          {data.teams.length > 0 && (
            <><Divider /><Teams data={data} /></>
          )}

          <Divider />
          <Projects data={data} />

          {data.assignedTasks.length > 0 && (
            <><Divider /><Tasks data={data} /></>
          )}

          {children && (
            <><Divider /><div className="px-4 pb-3 pt-2">{children}</div></>
          )}

          {profileHref != null && (
            <>
              <Divider />
              <div className="px-4 py-2">
                <a
                  href={profileHref}
                  className="inline-flex items-center gap-1 text-[10px] text-[#7c3aed]
                    hover:text-[#a78bfa] transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  View full profile
                </a>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

// ── Attach sub-components ─────────────────────────────────────────────────────

export const UserProfileCard = Object.assign(UserProfileCardRoot, {
  Header, Stats, Teams, Projects, Tasks,
  LoadingSkeleton, Avatar, Divider, SectionHeading,
});
