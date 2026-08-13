/**
 * CreateEventModal — form to create a new calendar event.
 */

import React, { useState } from 'react';
import { X, Loader2, Calendar } from 'lucide-react';
import type { CreateEventPayload } from '../types';

const ACCENT_COLORS = [
  '#7c3aed', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
];

interface CreateEventModalProps {
  defaultDate?: Date | undefined;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  onClose: () => void;
}

export function CreateEventModal({ defaultDate, onSubmit, onClose }: CreateEventModalProps) {
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
        className="w-full max-w-md bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f23]">
          <Calendar className="w-4 h-4 text-[#7c3aed]" />
          <h2 className="text-sm font-semibold text-[#fafafa] flex-1">New Event</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

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
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
