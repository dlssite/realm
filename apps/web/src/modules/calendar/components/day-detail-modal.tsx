/**
 * DayDetailModal — shows all entries for a selected day.
 * Groups by type: Events · Tasks · Milestones.
 * Includes a "New Event" button and lets the user click any entry to view its details.
 */

import React from 'react';
import { X, Calendar, CheckSquare, Flag, Clock, Plus } from 'lucide-react';
import { formatShortDate, formatTime } from '../utils/calendar-utils';
import type { CalendarEntry, CalendarEvent, CalendarTaskEntry, CalendarMilestoneEntry } from '../types';

interface DayDetailModalProps {
  date: Date;
  entries: CalendarEntry[];
  onClose: () => void;
  onEntryClick: (entry: CalendarEntry) => void;
  onNewEvent: (date: Date) => void;
}

export function DayDetailModal({
  date,
  entries,
  onClose,
  onEntryClick,
  onNewEvent,
}: DayDetailModalProps) {
  const events = entries.filter((e): e is CalendarEntry & { kind: 'event' } & CalendarEvent => e.kind === 'event');
  const tasks = entries.filter((e): e is CalendarEntry & { kind: 'task' } & CalendarTaskEntry => e.kind === 'task');
  const milestones = entries.filter((e): e is CalendarEntry & { kind: 'milestone' } & CalendarMilestoneEntry => e.kind === 'milestone');

  const dayLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const total = entries.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f23] flex-shrink-0">
          <Calendar className="w-4 h-4 text-[#34d399] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-[#fafafa] truncate">{dayLabel}</h2>
            <p className="text-xs text-[#52525b] mt-0.5">
              {total === 0 ? 'No entries' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
            </p>
          </div>
          <button
            onClick={() => { onNewEvent(date); onClose(); }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs rounded-md font-medium transition-colors flex-shrink-0"
            title="New Event"
          >
            <Plus className="w-3 h-3" />
            <span>New Event</span>
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {total === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Calendar className="w-8 h-8 text-[#27272a]" />
              <p className="text-sm text-[#52525b]">Nothing scheduled for this day.</p>
              <button
                onClick={() => { onNewEvent(date); onClose(); }}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1f23] hover:bg-[#27272a] text-[#a1a1aa] text-xs rounded-md transition-colors"
              >
                <Plus className="w-3 h-3" />
                Create an event
              </button>
            </div>
          )}

          {/* ── Events ──────────────────────────────────────────────────── */}
          {events.length > 0 && (
            <section>
              <SectionHeader icon={<Calendar className="w-3 h-3" />} label="Events" count={events.length} color="text-[#7c3aed]" />
              <div className="space-y-1.5 mt-2">
                {events.map((entry) => (
                  <EventRow
                    key={entry.id}
                    entry={entry}
                    onClick={() => { onEntryClick(entry); onClose(); }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Tasks ───────────────────────────────────────────────────── */}
          {tasks.length > 0 && (
            <section>
              <SectionHeader icon={<CheckSquare className="w-3 h-3" />} label="Tasks" count={tasks.length} color="text-[#60a5fa]" />
              <div className="space-y-1.5 mt-2">
                {tasks.map((entry) => (
                  <TaskRow
                    key={entry.id}
                    entry={entry}
                    onClick={() => { onEntryClick(entry); onClose(); }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Milestones ──────────────────────────────────────────────── */}
          {milestones.length > 0 && (
            <section>
              <SectionHeader icon={<Flag className="w-3 h-3" />} label="Milestones" count={milestones.length} color="text-[#fb923c]" />
              <div className="space-y-1.5 mt-2">
                {milestones.map((entry) => (
                  <MilestoneRow
                    key={entry.id}
                    entry={entry}
                    onClick={() => { onEntryClick(entry); onClose(); }}
                  />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest ${color}`}>
      {icon}
      {label}
      <span className="ml-auto text-[#52525b] font-normal normal-case tracking-normal">{count}</span>
    </div>
  );
}

function EventRow({
  entry,
  onClick,
}: {
  entry: CalendarEntry & { kind: 'event' } & CalendarEvent;
  onClick: () => void;
}) {
  const hex = entry.color ?? '#7c3aed';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[#111113] border border-[#1f1f23] hover:border-[#27272a]"
    >
      <span
        className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#fafafa] truncate">{entry.title}</p>
        <p className="text-[10px] text-[#71717a] mt-0.5 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
          {entry.isAllDay
            ? 'All day'
            : `${formatTime(entry.startsAt)} – ${formatTime(entry.endsAt)}`}
        </p>
        {entry.description && (
          <p className="text-[10px] text-[#52525b] mt-0.5 truncate">{entry.description}</p>
        )}
      </div>
      {entry.attendees.length > 0 && (
        <span className="flex-shrink-0 text-[10px] text-[#52525b] mt-0.5">
          {entry.attendees.length} attendee{entry.attendees.length > 1 ? 's' : ''}
        </span>
      )}
    </button>
  );
}

function TaskRow({
  entry,
  onClick,
}: {
  entry: CalendarEntry & { kind: 'task' } & CalendarTaskEntry;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[#111113] border border-[#1f1f23] hover:border-[#27272a]"
    >
      <CheckSquare className="mt-0.5 w-3 h-3 text-[#60a5fa] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#fafafa] truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#71717a]">{entry.identifier}</span>
          <StatusBadge status={entry.status} />
          <PriorityBadge priority={entry.priority} />
        </div>
        {entry.project && (
          <p className="text-[10px] text-[#52525b] mt-0.5 truncate">{entry.project.name}</p>
        )}
      </div>
      {entry.assignee && (
        <span className="flex-shrink-0 text-[10px] text-[#52525b] mt-0.5 truncate max-w-[80px]">
          {entry.assignee.name}
        </span>
      )}
    </button>
  );
}

function MilestoneRow({
  entry,
  onClick,
}: {
  entry: CalendarEntry & { kind: 'milestone' } & CalendarMilestoneEntry;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[#111113] border border-[#1f1f23] hover:border-[#27272a]"
    >
      <Flag className="mt-0.5 w-3 h-3 text-[#fb923c] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#fafafa] truncate">{entry.name}</p>
        <p className="text-[10px] text-[#71717a] mt-0.5 truncate">{entry.project.name}</p>
      </div>
      {entry.isCompleted && (
        <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] mt-0.5">
          done
        </span>
      )}
    </button>
  );
}

// ── Tiny badges ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ').toLowerCase();
  return (
    <span className="text-[10px] px-1.5 py-0 rounded-full bg-[#1f1f23] text-[#71717a] border border-[#27272a]">
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    URGENT: 'text-[#f87171] bg-[#f87171]/10',
    HIGH: 'text-[#fb923c] bg-[#fb923c]/10',
    MEDIUM: 'text-[#fbbf24] bg-[#fbbf24]/10',
    LOW: 'text-[#71717a] bg-[#1f1f23]',
    NO_PRIORITY: 'text-[#52525b] bg-[#1f1f23]',
  };
  const cls = map[priority] ?? map['NO_PRIORITY']!;
  const label = priority.replace(/_/g, ' ').toLowerCase();
  return (
    <span className={`text-[10px] px-1.5 py-0 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
