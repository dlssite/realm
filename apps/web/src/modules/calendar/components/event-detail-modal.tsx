/**
 * EventDetailModal — slide-up overlay showing full event/task/milestone details.
 */

import React from 'react';
import { X, Calendar, CheckSquare, Flag, Clock, Users, Trash2 } from 'lucide-react';
import { formatTime, formatShortDate } from '../utils/calendar-utils';
import type { CalendarEntry } from '../types';

interface EventDetailModalProps {
  entry: CalendarEntry;
  currentUserId: string;
  onClose: () => void;
  onDelete?: ((eventId: string) => void) | undefined;
}

export function EventDetailModal({
  entry,
  currentUserId,
  onClose,
  onDelete,
}: EventDetailModalProps) {
  const isCustomEvent = entry.kind === 'event';
  const isTask = entry.kind === 'task';
  const isMilestone = entry.kind === 'milestone';

  const canDelete =
    isCustomEvent &&
    (entry.createdById === currentUserId) &&
    onDelete != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stripe */}
        {isCustomEvent && (
          <div className="h-1 w-full" style={{ backgroundColor: entry.color }} />
        )}
        {isTask && <div className="h-1 w-full bg-[#60a5fa]" />}
        {isMilestone && <div className="h-1 w-full bg-[#fb923c]" />}

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#1f1f23]">
          <div className="mt-0.5">
            {isCustomEvent && <Calendar className="w-4 h-4 text-[#a1a1aa]" />}
            {isTask && <CheckSquare className="w-4 h-4 text-[#60a5fa]" />}
            {isMilestone && <Flag className="w-4 h-4 text-[#fb923c]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#fafafa] leading-snug">
              {isCustomEvent || isTask ? entry.title : entry.name}
            </p>
            <p className="text-xs text-[#52525b] mt-0.5 capitalize">
              {entry.kind}
              {isTask && ` · ${entry.status.replace('_', ' ').toLowerCase()}`}
              {isMilestone && entry.isCompleted && ' · completed'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">

          {/* Time row */}
          <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <Clock className="w-3.5 h-3.5 text-[#52525b] flex-shrink-0" />
            {isCustomEvent && (
              <span>
                {entry.isAllDay
                  ? `All day · ${formatShortDate(new Date(entry.startsAt))}`
                  : `${formatShortDate(new Date(entry.startsAt))} · ${formatTime(entry.startsAt)} – ${formatTime(entry.endsAt)}`}
              </span>
            )}
            {(isTask || isMilestone) && (
              <span>Due {formatShortDate(new Date(isTask ? entry.dueDate : entry.dueDate))}</span>
            )}
          </div>

          {/* Description */}
          {isCustomEvent && entry.description && (
            <p className="text-xs text-[#a1a1aa] leading-relaxed">{entry.description}</p>
          )}

          {/* Project tag */}
          {entry.project && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1f1f23] border border-[#27272a] text-[#71717a]">
                {entry.project.identifier} · {entry.project.name}
              </span>
            </div>
          )}

          {/* Attendees (custom events only) */}
          {isCustomEvent && entry.attendees.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#52525b]">
                <Users className="w-3 h-3" />
                Attendees
              </div>
              <div className="space-y-1">
                {entry.attendees.map((att) => (
                  <div key={att.user.id} className="flex items-center justify-between">
                    <span className="text-xs text-[#a1a1aa]">{att.user.name}</span>
                    <RsvpBadge rsvp={att.rsvp} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignee (tasks only) */}
          {isTask && entry.assignee && (
            <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
              <Users className="w-3.5 h-3.5 text-[#52525b]" />
              Assigned to {entry.assignee.name}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {canDelete && (
          <div className="px-5 py-3 border-t border-[#1f1f23] flex justify-end">
            <button
              onClick={() => { onDelete!(entry.id); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#f87171] hover:bg-[#27171a] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── RSVP badge ────────────────────────────────────────────────────────────────

function RsvpBadge({ rsvp }: { rsvp: string }) {
  const map: Record<string, string> = {
    ACCEPTED: 'text-[#4ade80] bg-[#4ade80]/10',
    DECLINED: 'text-[#f87171] bg-[#f87171]/10',
    MAYBE: 'text-[#fb923c] bg-[#fb923c]/10',
    PENDING: 'text-[#71717a] bg-[#71717a]/10',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${map[rsvp] ?? map.PENDING}`}>
      {rsvp.toLowerCase()}
    </span>
  );
}
