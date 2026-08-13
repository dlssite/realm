/**
 * ActivityPage — workspace-wide audit log feed.
 *
 * Features:
 *  - Cursor-based infinite scroll (loads 30 at a time)
 *  - Grouped by calendar date (Today / Yesterday / <date>)
 *  - Filter by module (entityType) and action
 *  - Empty state and loading skeleton
 *  - Error state with retry
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, RefreshCw, Activity } from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { listActivity } from '../api/activity-api';
import { ActivityItem } from '../components/activity-item';
import { ActivityFilters, type ActivityFilterState } from '../components/activity-filters';
import type { ActivityEvent } from '../types';

// ── Date group helpers ────────────────────────────────────────────────────────

function dayLabel(iso: string): string {
  const date  = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  if (sameDay(date, today))     return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDay(events: ActivityEvent[]): { label: string; events: ActivityEvent[] }[] {
  const map = new Map<string, ActivityEvent[]>();
  for (const ev of events) {
    const label = dayLabel(ev.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(ev);
  }
  return Array.from(map.entries()).map(([label, evs]) => ({ label, events: evs }));
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-0 divide-y divide-[#1f1f23]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-[#27272a] flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 bg-[#27272a] rounded w-3/4" />
            <div className="h-2.5 bg-[#1f1f23] rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center mb-4">
        <Activity className="w-7 h-7 text-[#a78bfa]" />
      </div>
      <p className="text-sm font-medium text-[#e4e4e7]">
        {filtered ? 'No activity matches your filters' : 'No activity yet'}
      </p>
      <p className="text-xs text-[#52525b] mt-1 max-w-xs">
        {filtered
          ? 'Try clearing the filters to see the full workspace history.'
          : 'As your team creates tasks, updates projects, and collaborates, events will appear here.'}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ActivityPage() {
  const { token, workspace } = useAuthStore();

  const [events, setEvents]         = useState<ActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [filters, setFilters]       = useState<ActivityFilterState>({ entityType: '', action: '' });

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (cursor?: string, reset = false) => {
      if (!token || !workspace?.id) return;

      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);

      try {
        const params: import('../types').ListActivityParams = { limit: 30 };
        if (filters.entityType) params.entityType = filters.entityType;
        if (filters.action)     params.action     = filters.action;
        if (cursor)             params.cursor      = cursor;

        const page = await listActivity(token, workspace.id, params);

        setEvents(prev => reset ? page.items : [...prev, ...page.items]);
        setNextCursor(page.nextCursor ?? null);
        setHasNextPage(page.hasNextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        reset ? setLoading(false) : setLoadingMore(false);
      }
    },
    [token, workspace?.id, filters]
  );

  // Initial load and re-fetch when filters change
  useEffect(() => {
    fetchFeed(undefined, true);
  }, [fetchFeed]);

  // ── Infinite scroll via IntersectionObserver ────────────────────────────────

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !loadingMore) {
          fetchFeed(nextCursor ?? undefined);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, loadingMore, nextCursor, fetchFeed]);

  // ── Grouped view ────────────────────────────────────────────────────────────

  const groups = groupByDay(events);
  const isFiltered = filters.entityType !== '' || filters.action !== '';

  return (
    <div className="space-y-0 pb-16">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1f1f23]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#a78bfa] font-medium mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Workspace Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight">Activity</h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Every create, update, and delete across {workspace?.name ?? 'your workspace'}.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => fetchFeed(undefined, true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#fafafa] px-3 py-1.5 rounded-lg border border-[#27272a] hover:border-[#3f3f46] bg-[#18181b] hover:bg-[#1f1f23] transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="py-3 border-b border-[#1f1f23]">
        <ActivityFilters filters={filters} onChange={(next) => setFilters(next)} />
      </div>

      {/* ── Feed ────────────────────────────────────────────────────────────── */}
      <div className="mt-2">

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 mt-4">
            <span>{error}</span>
            <button
              onClick={() => fetchFeed(undefined, true)}
              className="text-xs underline underline-offset-2 hover:text-red-300 transition-colors ml-3 flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <ActivitySkeleton />}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <EmptyState filtered={isFiltered} />
        )}

        {/* Date-grouped feed */}
        {!loading && events.length > 0 && (
          <div>
            {groups.map((group) => (
              <div key={group.label}>
                {/* Day divider */}
                <div className="flex items-center gap-3 py-3 sticky top-0 bg-[#09090b] z-10">
                  <span className="text-xs font-semibold text-[#52525b] uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-[#1f1f23]" />
                  <span className="text-[10px] text-[#3f3f46] tabular-nums">
                    {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Items for this day */}
                <div className="divide-y divide-[#1a1a1d]">
                  {group.events.map((ev) => (
                    <ActivityItem key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more sentinel */}
            <div ref={loadMoreRef} className="h-8" />

            {/* Loading more spinner */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-4 h-4 border-2 border-[#3f3f46] border-t-[#a78bfa] rounded-full animate-spin" />
              </div>
            )}

            {/* End of feed */}
            {!hasNextPage && events.length > 0 && (
              <p className="text-center text-[10px] text-[#3f3f46] py-6 uppercase tracking-wider">
                You're all caught up
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityPage;
