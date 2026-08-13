/**
 * EventChip — compact pill rendered inside a calendar cell.
 * Colour-coded by type: custom event uses event.color, tasks = blue, milestones = amber.
 */

import React from 'react';
import { CheckSquare, Flag } from 'lucide-react';
import type { CalendarEntry } from '../types';

interface EventChipProps {
  entry: CalendarEntry;
  onClick: () => void;
}

export function EventChip({ entry, onClick }: EventChipProps) {
  if (entry.kind === 'task') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 w-full px-1.5 py-0.5 rounded text-left text-[10px] font-medium truncate bg-[#1e3a5f] text-[#60a5fa] hover:bg-[#1e40af]/40 transition-colors"
        title={entry.title}
      >
        <CheckSquare className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="truncate">{entry.title}</span>
      </button>
    );
  }

  if (entry.kind === 'milestone') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 w-full px-1.5 py-0.5 rounded text-left text-[10px] font-medium truncate bg-[#451a03] text-[#fb923c] hover:bg-[#78350f]/40 transition-colors"
        title={entry.name}
      >
        <Flag className="w-2.5 h-2.5 flex-shrink-0" />
        <span className="truncate">{entry.name}</span>
      </button>
    );
  }

  // Custom event — use the event's own color
  const hex = entry.color ?? '#7c3aed';
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 w-full px-1.5 py-0.5 rounded text-left text-[10px] font-medium truncate hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: `${hex}22`,
        color: hex,
        border: `1px solid ${hex}44`,
      }}
      title={entry.title}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <span className="truncate">{entry.title}</span>
    </button>
  );
}
