/**
 * CalendarPage — unified month-view calendar.
 * Surfaces custom events, task due dates, and project milestones.
 * Replaces the Coming Soon placeholder.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useToast } from '../../../shared/hooks/use-toast';
import { fetchFeed, createEvent, deleteEvent, updateRsvp } from '../api/calendar-api';
import { listMembers } from '../../workspace/api/workspace-api';
import type { WorkspaceMember } from '../../workspace/types';
import { CalendarGrid } from '../components/calendar-grid';
import { CreateEventModal } from '../components/create-event-modal';
import { EventDetailModal } from '../components/event-detail-modal';
import { DayDetailModal } from '../components/day-detail-modal';
import {
  formatMonthYear,
  getMonthRange,
  isSameDay,
} from '../utils/calendar-utils';
import type { CalendarEntry, CalendarFeed, CreateEventPayload } from '../types';

export function CalendarPage() {
  const { token, workspace, user } = useAuthStore();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [feed, setFeed] = useState<CalendarFeed>({ events: [], tasks: [], milestones: [] });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>();
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Load feed whenever month changes ──────────────────────────────────────
  const loadFeed = useCallback(async () => {
    if (!token || !workspace) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { from, to } = getMonthRange(currentMonth);
      const data = await fetchFeed(token, workspace.id, from, to);
      setFeed(data);
    } catch {
      setFetchError('Could not load calendar. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [token, workspace, currentMonth]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // ── Load workspace members once (for attendee picker) ─────────────────────
  useEffect(() => {
    if (!token || !workspace) return;
    listMembers(token, workspace.id)
      .then(setMembers)
      .catch(() => { /* non-critical — picker just stays empty */ });
  }, [token, workspace]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));

  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setCurrentMonth(d);
  };

  // ── Build unified entry list for the grid ──────────────────────────────────
  const allEntries: CalendarEntry[] = [
    ...feed.events.map((e) => ({ kind: 'event' as const, ...e })),
    ...feed.tasks.map((t) => ({ kind: 'task' as const, ...t })),
    ...feed.milestones.map((m) => ({ kind: 'milestone' as const, ...m })),
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
  };

  const handleOpenCreateForDate = (date: Date) => {
    setDefaultEventDate(date);
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (payload: CreateEventPayload) => {
    if (!token || !workspace) return;
    try {
      const newEvent = await createEvent(token, workspace.id, payload);
      setFeed((prev) => ({ ...prev, events: [...prev.events, newEvent] }));
      toast.success('Event created', payload.title);
    } catch {
      toast.error('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!token || !workspace) return;
    try {
      await deleteEvent(token, workspace.id, eventId);
      setFeed((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== eventId),
      }));
      toast.info('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const handleRsvp = async (eventId: string, rsvp: 'ACCEPTED' | 'DECLINED' | 'MAYBE') => {
    if (!token || !workspace) return;
    await updateRsvp(token, workspace.id, eventId, rsvp);
    // Update the feed so the attendees list reflects the new status immediately
    setFeed((prev) => ({
      ...prev,
      events: prev.events.map((ev) =>
        ev.id !== eventId
          ? ev
          : {
              ...ev,
              attendees: ev.attendees.map((a) =>
                a.user.id === user?.id ? { ...a, rsvp } : a
              ),
            }
      ),
    }));
    // Also patch selectedEntry so the detail modal re-renders without closing
    setSelectedEntry((prev) => {
      if (!prev || prev.kind !== 'event' || prev.id !== eventId) return prev;
      return {
        ...prev,
        attendees: prev.attendees.map((a) =>
          a.user.id === user?.id ? { ...a, rsvp } : a
        ),
      };
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#1f1f23]">
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#34d399] flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#fafafa]">Calendar</h1>
            <p className="text-xs text-[#71717a] mt-0.5 hidden sm:block">
              Events, task due dates, and project milestones in one view
            </p>
          </div>
        </div>
        <button
          onClick={() => { setDefaultEventDate(undefined); setShowCreateModal(true); }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs rounded-md font-medium transition-colors flex-shrink-0"
          title="New Event"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Event</span>
        </button>
      </div>

      {/* Month nav bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-medium bg-[#1f1f23] hover:bg-[#27272a] text-[#a1a1aa] rounded-md transition-colors"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-sm font-semibold text-[#fafafa]">
          {formatMonthYear(currentMonth)}
        </h2>

        {/* Legend — wraps on mobile */}
        <div className="flex items-center gap-3 sm:gap-4 sm:ml-auto text-[10px] text-[#52525b] flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#7c3aed] flex-shrink-0" /> Events
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#60a5fa] flex-shrink-0" /> Tasks
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#fb923c] flex-shrink-0" /> Milestones
          </span>
        </div>
      </div>

      {/* Calendar grid — scrollable horizontally on very small screens */}
      {loading && (
        <div className="flex items-center justify-center h-80">
          <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
        </div>
      )}

      {!loading && fetchError && (
        <div className="flex items-center justify-center h-80">
          <p className="text-sm text-[#f87171]">{fetchError}</p>
        </div>
      )}

      {!loading && !fetchError && (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="min-w-[480px]">
            <CalendarGrid
              month={currentMonth}
              entries={allEntries}
              onDayClick={handleDayClick}
              onEntryClick={setSelectedEntry}
              onOverflowClick={handleDayClick}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          entries={allEntries.filter((e) => {
            const d =
              e.kind === 'event'
                ? new Date(e.startsAt)
                : new Date(e.dueDate);
            return isSameDay(d, selectedDay);
          })}
          onClose={() => setSelectedDay(null)}
          onEntryClick={(entry) => { setSelectedDay(null); setSelectedEntry(entry); }}
          onNewEvent={(date) => { setSelectedDay(null); handleOpenCreateForDate(date); }}
        />
      )}

      {showCreateModal && (
        <CreateEventModal
          {...(defaultEventDate !== undefined ? { defaultDate: defaultEventDate } : {})}
          members={members}
          currentUserId={user?.id}
          onSubmit={handleCreateEvent}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {selectedEntry && (
        <EventDetailModal
          entry={selectedEntry}
          currentUserId={user?.id ?? ''}
          onClose={() => setSelectedEntry(null)}
          {...(selectedEntry.kind === 'event'
            ? {
                onDelete: (id: string) => { void handleDeleteEvent(id); },
                onRsvp: handleRsvp,
              }
            : {})}
        />
      )}

    </div>
  );
}

export default CalendarPage;
