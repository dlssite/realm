import React from 'react';
import { Flag } from 'lucide-react';

interface Task {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  blockedBy?: { blockingTaskId: string }[];
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string | null;
  isCompleted: boolean;
}

interface TimelineViewProps {
  tasks: Task[];
  milestones?: Milestone[];
  onTaskClick: (taskId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG:     '#71717a',
  TODO:        '#a1a1aa',
  IN_PROGRESS: '#f59e0b',
  IN_REVIEW:   '#818cf8',
  DONE:        '#4ade80',
  CANCELLED:   '#f87171',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#f87171',
  HIGH:   '#fb923c',
  MEDIUM: '#facc15',
  LOW:    '#a1a1aa',
  NONE:   '#52525b',
};

const DAY_COLS = 14; // 14-day rolling window

export function TimelineView({ tasks, milestones = [], onTaskClick }: TimelineViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start 3 days before today
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 3);

  const days: Date[] = Array.from({ length: DAY_COLS }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });

  /** Returns floating-point day offset from startDate (can be negative / > 14) */
  const dayOffset = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return (d.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
  };

  /** Clamp & convert day offset to percentage width of the grid (0–100%) */
  const pct = (offset: number) => `${(Math.max(0, Math.min(DAY_COLS, offset)) / DAY_COLS) * 100}%`;

  const todayOffset = (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#0c0c0e] border border-[#1f1f23] rounded-md">

      {/* ── Outer horizontal scroll wrapper (mobile) ── */}
      <div className="flex flex-col flex-1 overflow-hidden overflow-x-auto">
        {/* min-width ensures the timeline never crushes below a usable size */}
        <div className="flex flex-col flex-1 min-w-[600px]">

          {/* ── Header row ── */}
          <div className="flex border-b border-[#1f1f23] bg-[#09090b] shrink-0">
            <div className="w-48 sm:w-64 shrink-0 px-3 sm:px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#71717a] border-r border-[#1f1f23]">
              Items
            </div>
            <div
              className="flex-1 relative"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${DAY_COLS}, 1fr)` }}
            >
              {days.map((day, i) => {
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <div
                    key={i}
                    className={`border-r border-[#1f1f23] py-2 flex flex-col items-center justify-center text-center ${isToday ? 'bg-[#7c3aed]/10' : ''}`}
                  >
                    <span className={`text-[9px] font-semibold uppercase ${isToday ? 'text-[#a78bfa]' : 'text-[#52525b]'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-[11px] font-mono ${isToday ? 'text-[#7c3aed] font-bold' : 'text-[#a1a1aa]'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#141417]">

            {milestones.length > 0 && milestones.map((m) => {
              const off = dayOffset(m.dueDate);
              return (
                <div key={m.id} className="flex items-center h-10 hover:bg-[#0f0f11] transition-colors">
                  <div className="w-48 sm:w-64 shrink-0 px-3 sm:px-4 flex items-center space-x-2 border-r border-[#1f1f23] h-full">
                    <Flag className={`w-3.5 h-3.5 shrink-0 ${m.isCompleted ? 'text-[#4ade80]' : 'text-[#f59e0b]'}`} />
                    <span className="text-xs text-[#a1a1aa] truncate">{m.name}</span>
                  </div>
                  <div className="flex-1 relative h-full">
                    <div className="absolute top-0 bottom-0 w-px bg-[#7c3aed]/40 z-10" style={{ left: pct(todayOffset) }} />
                    {off !== null && off >= 0 && off <= DAY_COLS && (
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center z-20" style={{ left: pct(off) }}>
                        <div className={`w-4 h-4 rotate-45 border-2 rounded-sm ${m.isCompleted ? 'bg-[#4ade80] border-[#4ade80]' : 'bg-[#f59e0b] border-[#f59e0b]'}`} />
                        <span className="ml-1 text-[9px] text-[#f59e0b] font-semibold whitespace-nowrap">{m.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-[#52525b]">
                No tasks to display. Create tasks with due dates to see them on the timeline.
              </div>
            ) : (
              tasks.map((task) => {
                const createOff = dayOffset(task.createdAt) ?? 0;
                const dueOff = dayOffset(task.dueDate);
                const barStart = Math.max(0, createOff);
                const barEnd = dueOff !== null ? Math.min(DAY_COLS, dueOff) : Math.min(DAY_COLS, createOff + 2);
                const barLeft = pct(barStart);
                const barWidth = `${Math.max(0.5, ((barEnd - barStart) / DAY_COLS) * 100)}%`;
                const color = STATUS_COLORS[task.status] ?? '#71717a';
                const isBlocked = task.blockedBy && task.blockedBy.length > 0;
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className="flex items-center h-11 hover:bg-[#0f0f11] cursor-pointer transition-colors group"
                  >
                    <div className="w-48 sm:w-64 shrink-0 px-3 sm:px-4 flex items-center space-x-2 border-r border-[#1f1f23] h-full overflow-hidden">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-mono text-[9px] text-[#52525b] shrink-0">{task.identifier}</span>
                      <span className="text-xs text-[#e4e4e7] truncate group-hover:text-[#a78bfa] transition-colors">{task.title}</span>
                      {isBlocked && <span className="text-[8px] bg-[#431407] text-[#fb923c] px-1 rounded font-bold shrink-0">BLK</span>}
                    </div>
                    <div className="flex-1 relative h-full">
                      <div className="absolute top-0 bottom-0 w-px bg-[#7c3aed]/40 z-10" style={{ left: pct(todayOffset) }} />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-6 rounded flex items-center justify-between px-2 z-20 transition-all group-hover:brightness-125"
                        style={{ left: barLeft, width: barWidth, backgroundColor: `${color}28`, border: `1px solid ${color}` }}
                      >
                        <span className="text-[9px] font-semibold truncate" style={{ color }}>{task.identifier}</span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} title={task.priority} />
                          {task.assignee && (
                            <div className="w-4 h-4 rounded-full bg-[#27272a] flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                              {task.assignee.name[0]}
                            </div>
                          )}
                        </div>
                      </div>
                      {dueOff !== null && dueOff >= 0 && dueOff <= DAY_COLS && (
                        <div className="absolute top-1/2 -translate-y-1/2 w-px h-4 z-30" style={{ left: pct(dueOff), backgroundColor: color }} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Legend ── */}
          <div className="shrink-0 border-t border-[#1f1f23] px-3 sm:px-4 py-2 flex items-center space-x-3 sm:space-x-5 text-[10px] text-[#52525b] overflow-x-auto">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center space-x-1.5 shrink-0">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span>{status.replace('_', ' ')}</span>
              </div>
            ))}
            <div className="flex items-center space-x-1.5 ml-auto shrink-0">
              <div className="w-px h-3 bg-[#7c3aed]/60" />
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0">
              <div className="w-3 h-3 rotate-45 bg-[#f59e0b] rounded-sm" />
              <span>Milestone</span>
            </div>
          </div>

        </div>{/* end min-width wrapper */}
      </div>{/* end horizontal scroll */}

    </div>
  );
}
