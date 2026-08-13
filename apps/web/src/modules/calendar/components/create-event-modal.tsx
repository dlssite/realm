/**
 * CreateEventModal — form to create a new calendar event.
 * Includes an attendee picker that searches workspace members.
 */

import React, { useState, useMemo } from 'react';
import { X, Loader2, Calendar, Users, Search, Check, UserPlus } from 'lucide-react';
import type { CreateEventPayload } from '../types';
import type { WorkspaceMember } from '../../workspace/types';

const ACCENT_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
];

interface CreateEventModalProps {
  defaultDate?: Date | undefined;
  /** All workspace members — passed from CalendarPage */
  members?: WorkspaceMember[];
  /** The current user's id — excluded from the picker (they're auto-added as creator) */
  currentUserId?: string | undefined;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  onClose: () => void;
}

export function CreateEventModal({
  defaultDate,
  members = [],
  currentUserId,
  onSubmit,
  onClose,
}: CreateEventModalProps) {
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const baseDate = defaultDate ?? new Date();
  const startDefault = new Date(baseDate);
  startDefault.setHours(9, 0, 0, 0);
  const endDefault = new Date(baseDate);
  endDefault.setHours(10, 0, 0, 0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalInput(startDefault));
  const [endsAt, setEndsAt] = useState(toLocalInput(endDefault));
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState(ACCENT_COLORS[0]!);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Attendee picker state ──────────────────────────────────────────────────
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  // Members excluding the creator (they're auto-added server-side)
  const pickableMembers = useMemo(
    () => members.filter((m) => m.userId !== currentUserId && m.user),
    [members, currentUserId]
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.toLowerCase();
    if (!q) return pickableMembers;
    return pickableMembers.filter(
      (m) =>
        m.user!.name.toLowerCase().includes(q) ||
        m.user!.email.toLowerCase().includes(q)
    );
  }, [pickableMembers, memberSearch]);

  const toggleAttendee = (userId: string) => {
    setAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedMembers = pickableMembers.filter((m) => attendeeIds.includes(m.userId));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        isAllDay,
        color,
        ...(attendeeIds.length > 0 && { attendeeIds }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f23] flex-shrink-0">
          <Calendar className="w-4 h-4 text-[#7c3aed]" />
          <h2 className="text-sm font-semibold text-[#fafafa] flex-1">New Event</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form — scrollable */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Event title"
              className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">
              Description <span className="normal-case font-normal text-[#52525b]">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add details…"
              className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:border-[#7c3aed] transition-colors resize-none"
            />
          </div>

          {/* All-day toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setIsAllDay((v) => !v)}
              className={`relative w-8 h-4 rounded-full transition-colors ${isAllDay ? 'bg-[#7c3aed]' : 'bg-[#27272a]'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isAllDay ? 'translate-x-4' : ''}`}
              />
            </div>
            <span className="text-xs text-[#a1a1aa]">All-day event</span>
          </label>

          {/* Date/time */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Starts</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Ends</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-[#7c3aed] transition-colors"
                />
              </div>
            </div>
          )}

          {isAllDay && (
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={startsAt.split('T')[0]}
                onChange={(e) => {
                  setStartsAt(`${e.target.value}T00:00`);
                  setEndsAt(`${e.target.value}T23:59`);
                }}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-3 py-2 text-xs text-[#fafafa] focus:outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
          )}

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#0c0c0e] ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* ── Attendees ──────────────────────────────────────────────────── */}
          {pickableMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Invite attendees
                  <span className="normal-case font-normal text-[#52525b]">(optional)</span>
                </label>
                {!showPicker && (
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add people
                  </button>
                )}
              </div>

              {/* Selected attendees chips */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedMembers.map((m) => (
                    <span
                      key={m.userId}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/30"
                    >
                      <Avatar name={m.user!.name} size="xs" />
                      {m.user!.name}
                      <button
                        type="button"
                        onClick={() => toggleAttendee(m.userId)}
                        className="ml-0.5 hover:text-[#f87171] transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Picker dropdown */}
              {showPicker && (
                <div className="border border-[#27272a] rounded-lg bg-[#09090b] overflow-hidden">
                  {/* Search */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f23]">
                    <Search className="w-3 h-3 text-[#52525b] flex-shrink-0" />
                    <input
                      autoFocus
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members…"
                      className="flex-1 bg-transparent text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowPicker(false); setMemberSearch(''); }}
                      className="text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Member list */}
                  <div className="max-h-40 overflow-y-auto">
                    {filteredMembers.length === 0 && (
                      <p className="px-3 py-3 text-xs text-[#52525b] text-center">No members found</p>
                    )}
                    {filteredMembers.map((m) => {
                      const selected = attendeeIds.includes(m.userId);
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggleAttendee(m.userId)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#1f1f23] transition-colors text-left"
                        >
                          <Avatar name={m.user!.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#fafafa] truncate">{m.user!.name}</p>
                            <p className="text-[10px] text-[#52525b] truncate">{m.user!.email}</p>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-[#7c3aed] border-[#7c3aed]' : 'border-[#3f3f46]'}`}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Done button */}
                  <div className="px-3 py-2 border-t border-[#1f1f23] flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowPicker(false); setMemberSearch(''); }}
                      className="text-xs text-[#7c3aed] hover:text-[#a78bfa] transition-colors font-medium"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-[#f87171] bg-[#27171a] border border-[#7f1d1d] px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white text-xs rounded-md font-medium transition-colors"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Create Event
              {attendeeIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0 rounded-full bg-white/20 text-[10px]">
                  +{attendeeIds.length}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tiny avatar ───────────────────────────────────────────────────────────────

function Avatar({ name, size }: { name: string; size: 'xs' | 'sm' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dim = size === 'xs' ? 'w-3.5 h-3.5 text-[8px]' : 'w-6 h-6 text-[10px]';
  return (
    <span className={`${dim} rounded-full bg-[#27272a] text-[#a1a1aa] flex items-center justify-center font-medium flex-shrink-0`}>
      {initials}
    </span>
  );
}
