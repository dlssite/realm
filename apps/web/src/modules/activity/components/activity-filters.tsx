/**
 * ActivityFilters — compact filter bar for the activity feed.
 * Lets the user narrow by entity type and action.
 */

import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { AuditEntityType, AuditAction } from '../types';

const ENTITY_OPTIONS: { value: AuditEntityType; label: string }[] = [
  { value: 'TASK',      label: 'Tasks' },
  { value: 'PROJECT',   label: 'Projects' },
  { value: 'MILESTONE', label: 'Milestones' },
  { value: 'WIKI_PAGE', label: 'Wiki' },
  { value: 'COMMENT',   label: 'Comments' },
  { value: 'FILE',      label: 'Files' },
  { value: 'TEAM',      label: 'Teams' },
  { value: 'MEMBER',    label: 'Members' },
];

const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'CREATED',          label: 'Created' },
  { value: 'UPDATED',          label: 'Updated' },
  { value: 'DELETED',          label: 'Deleted' },
  { value: 'COMMENTED',        label: 'Commented' },
  { value: 'ASSIGNED',         label: 'Assigned' },
  { value: 'STATUS_CHANGED',   label: 'Status changed' },
  { value: 'PRIORITY_CHANGED', label: 'Priority changed' },
  { value: 'UPLOADED',         label: 'Uploaded' },
  { value: 'MENTIONED',        label: 'Mentioned' },
];

export interface ActivityFilterState {
  entityType: AuditEntityType | '';
  action: AuditAction | '';
}

interface ActivityFiltersProps {
  filters: ActivityFilterState;
  onChange: (next: ActivityFilterState) => void;
}

export function ActivityFilters({ filters, onChange }: ActivityFiltersProps) {
  const hasActive = filters.entityType !== '' || filters.action !== '';

  const handleClear = () => onChange({ entityType: '', action: '' });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SlidersHorizontal className="w-3.5 h-3.5 text-[#52525b] flex-shrink-0" />

      {/* Entity type filter */}
      <select
        value={filters.entityType}
        onChange={(e) => onChange({ ...filters, entityType: e.target.value as AuditEntityType | '' })}
        className="text-xs bg-[#1f1f23] border border-[#27272a] text-[#a1a1aa] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] appearance-none cursor-pointer hover:border-[#3f3f46] transition-colors"
      >
        <option value="">All modules</option>
        {ENTITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Action filter */}
      <select
        value={filters.action}
        onChange={(e) => onChange({ ...filters, action: e.target.value as AuditAction | '' })}
        className="text-xs bg-[#1f1f23] border border-[#27272a] text-[#a1a1aa] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7c3aed] focus:border-[#7c3aed] appearance-none cursor-pointer hover:border-[#3f3f46] transition-colors"
      >
        <option value="">All actions</option>
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Clear filters */}
      {hasActive && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#fafafa] px-2 py-1.5 rounded-md hover:bg-[#1f1f23] transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
