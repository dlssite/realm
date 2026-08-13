/**
 * EventDetailModal — slide-up overlay showing full event/task/milestone details.
 * For custom events: shows RSVP action buttons for the current user if they are an attendee.
 */

import React, { useState } from 'react';
import { X, Calendar, CheckSquare, Flag, Clock, Users, Trash2, Check, Minus, X as XIcon, Loader2 } from 'lucide-react';
import { formatTime, formatShortDate } from '../utils/calendar-utils';
import type { CalendarEntry, RsvpStatus } from '../types';

interface EventDetailModalProps {
  entry: CalendarEntry;
  currentUserId: string;
  onClose: () => void;
  onDelete?: ((eventId: string) => void) | undefined;
  /** Called when the current user submits an RSVP response */
  onRsvp?: (eventId: string, rsvp: 'ACCEPTED' | 'DECLINED' | 'MAYBE') => Promise<void>;
}

export function EventDetailModal({
  entry,
  currentUserId,
  onClose,
  onDelete,
  onRsvp,
}: EventDetailModalProps) {
  const isCustomEvent = entry.kind === 'event';
  const isTask = entry.kind === 'task';
  const isMilestone = entry.kind === 'milestone';

  const canDelete =
    isCustomEvent &&
    entry.createdById === currentUserId &&
    onDelete != null;

  // ── RSVP state ─────────────────────────────────────────────────────────────
  // Find the current user's attendee record (if they are an attendee)
  const myAttendee = isCustomEvent
    ? entry.attendees.find((a) => a.user.id === currentUserId)
    : undefined;

  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | undefined>(myAttendee?.rsvp);
  const [rsvpLoading, setRsvpLoading] = useState<'ACCEPTED' | 'DECLINED' | 'MAYBE' | null>(null);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const handleRsvp = async (rsvp: 'ACCEPTED' | 'DECLINED' | 'MAYBE') => {
    if (!onRsvp || !isCustomEvent || rsvp === rsvpStatus) return;
    setRsvpLoading(rsvp);
    setRsvpError(null);
    try {
      await onRsvp(entry.id, rsvp);
      setRsvpStatus(rsvp);
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'Failed to update RSVP');
    } finally {
      setRsvpLoading(null);
    }
  };

  // Show RSVP section if: user is an attendee, is not the creator (creator is auto-ACCEPTED), and onRsvp is wired
  const showRsvpActions =
    isCustomEvent &&
    myAttendee !== undefined &&
    entry.createdById !== currentUserId &&
    onRsvp != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header colour stripe */}
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

          {/* ── RSVP action buttons (attendee who is not the creator) ────── */}
          {showRsvpActions && (
            <div className="rounded-lg border border-[#27272a] bg-[#111113] px-3 py-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525b]">
                Your response
              </p>

              <div className="flex items-center gap-2">
                <RsvpButton
                  label="Accept"
                  icon={<Check className="w-3 h-3" />}
                  value="ACCEPTED"
                  current={rsvpStatus}
                  loading={rsvpLoading}
                  activeClass="bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/40"
                  inactiveClass="bg-[#1f1f23] text-[#71717a] border-[#27272a] hover:border-[#4ade80]/40 hover:text-[#4ade80]"
                  onClick={() => handleRsvp('ACCEPTED')}
                />
                <RsvpButton
                  label="Maybe"
                  icon={<Minus className="w-3 h-3" />}
                  value="MAYBE"
                  current={rsvpStatus}
                  loading={rsvpLoading}
                  activeClass="bg-[#fb923c]/15 text-[#fb923c] border-[#fb923c]/40"
                  inactiveClass="bg-[#1f1f23] text-[#71717a] border-[#27272a] hover:border-[#fb923c]/40 hover:text-[#fb923c]"
                  onClick={() => handleRsvp('MAYBE')}
                />
                <RsvpButton
                  label="Decline"
                  icon={<XIcon className="w-3 h-3" />}
                  value="DECLINED"
                  current={rsvpStatus}
                  loading={rsvpLoading}
                  activeClass="bg-[#f87171]/15 text-[#f87171] border-[#f87171]/40"
                  inactiveClass="bg-[#1f1f23] text-[#71717a] border-[#27272a] hover:border-[#f87171]/40 hover:text-[#f87171]"
                  onClick={() => handleRsvp('DECLINED')}
                />
              </div>

              {rsvpError && (
                <p className="text-[10px] text-[#f87171]">{rsvpError}</p>
              )}
            </div>
          )}

          {/* Attendees list (custom events only) */}
          {isCustomEvent && entry.attendees.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#52525b]">
                <Users className="w-3 h-3" />
                Attendees
                <span className="ml-auto font-normal normal-case tracking-normal text-[#3f3f46]">
                  {entry.attendees.filter((a) => a.rsvp === 'ACCEPTED').length}/{entry.attendees.length} accepted
                </span>
              </div>
              <div className="space-y-1">
                {entry.attendees.map((att) => (
                  <div key={att.user.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Mini avatar */}
                      <span className="w-5 h-5 rounded-full bg-[#27272a] text-[#a1a1aa] text-[9px] font-semibold flex items-center justify-center flex-shrink-0">
                        {att.user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <span className="text-xs text-[#a1a1aa] truncate">
                        {att.user.name}
                        {att.user.id === entry.createdById && (
                          <span className="ml-1 text-[10px] text-[#52525b]">(organiser)</span>
                        )}
                      </span>
                    </div>
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

        {/* Footer — delete */}
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

// ── RSVP action button ─────────────────────────────────────────────────────────

interface RsvpButtonProps {
  label: string;
  icon: React.ReactNode;
  value: 'ACCEPTED' | 'DECLINED' | 'MAYBE';
  current: RsvpStatus | undefined;
  loading: 'ACCEPTED' | 'DECLINED' | 'MAYBE' | null;
  activeClass: string;
  inactiveClass: string;
  onClick: () => void;
}

function RsvpButton({ label, icon, value, current, loading, activeClass, inactiveClass, onClick }: RsvpButtonProps) {
  const isActive = current === value;
  const isLoading = loading === value;
  return (
    <button
      onClick={onClick}
      disabled={loading !== null}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium flex-1 justify-center transition-all disabled:opacity-60 ${isActive ? activeClass : inactiveClass}`}
    >
      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ── RSVP read-only badge ───────────────────────────────────────────────────────

function RsvpBadge({ rsvp }: { rsvp: string }) {
  const map: Record<string, string> = {
    ACCEPTED: 'text-[#4ade80] bg-[#4ade80]/10',
    DECLINED: 'text-[#f87171] bg-[#f87171]/10',
    MAYBE: 'text-[#fb923c] bg-[#fb923c]/10',
    PENDING: 'text-[#71717a] bg-[#71717a]/10',
  };
  return (
    <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${map[rsvp] ?? map['PENDING']}`}>
      {rsvp.toLowerCase()}
    </span>
  );
}
