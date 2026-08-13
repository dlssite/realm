/**
 * CalendarGrid — month-view grid.
 * Each cell renders up to 3 EventChips with a "+N more" overflow indicator.
 */

import React from 'react';
import { EventChip } from './event-chip';
import {
  getMonthGrid,
  isSameDay,
  isToday,
  isCurrentMonth,
} from '../utils/calendar-utils';
import type { CalendarEntry } from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 3;

interface CalendarGridProps {
  month: Date;
  entries: CalendarEntry[];
  onDayClick: (date: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
}

export function CalendarGrid({
  month,
  entries,
  onDayClick,
  onEntryClick,
}: CalendarGridProps) {
  const cells = getMonthGrid(month);

  const getEntriesForDay = (day: Date): CalendarEntry[] =>
    entries.filter((e) => {
      const date =
        e.kind === 'event'
          ? new Date(e.startsAt)
          : e.kind === 'task'
          ? new Date(e.dueDate)
          : new Date(e.dueDate);
      return isSameDay(date, day);
    });

  return (
    <div className="border border-[#1f1f23] rounded-lg overflow-hidden">
      {/* Day-name header */}
      <div className="grid grid-cols-7 border-b border-[#1f1f23]">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="py-2 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-[#52525b]"
          >
            {/* Show single letter on very small screens, 3-letter on sm+ */}
            <span className="sm:hidden">{name[0]}</span>
            <span className="hidden sm:inline">{name}</span>
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div
        className="grid grid-cols-7"
        style={{ gridAutoRows: 'minmax(64px, auto)' }}
      >
        {cells.map((day, idx) => {
          const dayEntries = getEntriesForDay(day);
          const visible = dayEntries.slice(0, MAX_CHIPS);
          const overflow = dayEntries.length - MAX_CHIPS;
          const today = isToday(day);
          const inMonth = isCurrentMonth(day, month);

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[64px] sm:min-h-[90px] p-1 sm:p-1.5 border-b border-r border-[#1f1f23] cursor-pointer
                transition-colors hover:bg-[#111113]
                ${!inMonth ? 'opacity-40' : ''}
              `}
            >
              {/* Day number */}
              <div className="flex items-center justify-end mb-0.5 sm:mb-1">
                <span
                  className={`
                    inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-medium
                    ${today ? 'bg-[#7c3aed] text-white' : 'text-[#71717a] hover:text-[#fafafa]'}
                  `}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Entry chips — hidden on very small screens to avoid crush */}
              <div className="space-y-0.5 hidden xs:block sm:block">
                {visible.map((entry, i) => (
                  <EventChip
                    key={i}
                    entry={entry}
                    onClick={() => onEntryClick(entry)}
                  />
                ))}
                {overflow > 0 && (
                  <p className="text-[10px] text-[#52525b] pl-1">+{overflow}</p>
                )}
              </div>
              {/* Mobile: show dot indicators instead of full chips */}
              {dayEntries.length > 0 && (
                <div className="flex gap-0.5 flex-wrap mt-0.5 sm:hidden">
                  {dayEntries.slice(0, 3).map((entry, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        entry.kind === 'event' ? 'bg-[#7c3aed]' :
                        entry.kind === 'task' ? 'bg-[#60a5fa]' : 'bg-[#fb923c]'
                      }`}
                    />
                  ))}
                  {dayEntries.length > 3 && (
                    <span className="text-[8px] text-[#52525b]">+{dayEntries.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
