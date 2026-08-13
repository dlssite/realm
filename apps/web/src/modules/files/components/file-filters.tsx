/**
 * FileFilters — search, scope (workspace / project / team), type pills, sort.
 * All filtering is client-side. Teams derived from FileRecord.team field.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Search, X, ChevronDown, SlidersHorizontal,
  FileImage, FileVideo, FileText, FileCode, FileArchive, File,
  Building2, Briefcase, Users,
} from 'lucide-react';
import type { FileRecord } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FileTypeFilter =
  | 'all' | 'image' | 'video' | 'pdf' | 'code' | 'archive' | 'other';

export type SortOption =
  | 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

export interface FileFilterState {
  search:  string;
  type:    FileTypeFilter;
  /**
   * null        = show all
   * 'workspace' = only files with no project AND no team
   * any UUID    = filter by that project id OR team id
   */
  scopeId: string | null;
  sort:    SortOption;
}

export const DEFAULT_FILTERS: FileFilterState = {
  search:  '',
  type:    'all',
  scopeId: null,
  sort:    'newest',
};

interface FileFiltersProps {
  files:    FileRecord[];
  filters:  FileFilterState;
  onChange: (f: FileFilterState) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: {
  key: FileTypeFilter; label: string;
  icon: React.ElementType; color: string;
  match: (ct: string) => boolean;
}[] = [
  { key: 'image',   label: 'Images',   icon: FileImage,   color: 'text-[#34d399]',
    match: ct => ct.startsWith('image/') },
  { key: 'video',   label: 'Videos',   icon: FileVideo,   color: 'text-[#60a5fa]',
    match: ct => ct.startsWith('video/') },
  { key: 'pdf',     label: 'PDFs',     icon: FileText,    color: 'text-[#f87171]',
    match: ct => ct === 'application/pdf' },
  { key: 'code',    label: 'Code',     icon: FileCode,    color: 'text-[#a78bfa]',
    match: ct => ct.startsWith('text/') || ['javascript','typescript','json','xml'].some(s => ct.includes(s)) },
  { key: 'archive', label: 'Archives', icon: FileArchive, color: 'text-[#fb923c]',
    match: ct => ['zip','tar','gzip','compressed'].some(s => ct.includes(s)) },
  { key: 'other',   label: 'Other',    icon: File,        color: 'text-[#71717a]',
    match: ct =>
      !ct.startsWith('image/') && !ct.startsWith('video/') &&
      ct !== 'application/pdf' && !ct.startsWith('text/') &&
      !['javascript','typescript','json','xml','zip','tar','gzip','compressed'].some(s => ct.includes(s)) },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest',    label: 'Newest first'  },
  { value: 'oldest',    label: 'Oldest first'  },
  { value: 'name_asc',  label: 'Name A → Z'    },
  { value: 'name_desc', label: 'Name Z → A'    },
  { value: 'size_desc', label: 'Largest first' },
  { value: 'size_asc',  label: 'Smallest first'},
];

// ── Component ─────────────────────────────────────────────────────────────────

export function FileFilters({ files, filters, onChange }: FileFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortOpen,   setSortOpen]     = useState(false);
  const [scopeOpen,  setScopeOpen]    = useState(false);
  const sortRef  = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearchDraft(filters.search); }, [filters.search]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node))  setSortOpen(false);
      if (!scopeRef.current?.contains(e.target as Node)) setScopeOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const set = (patch: Partial<FileFilterState>) => onChange({ ...filters, ...patch });

  const handleSearch = (val: string) => {
    setSearchDraft(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => set({ search: val }), 220);
  };

  // Derive unique projects + teams from the loaded file list
  const projects = Array.from(
    new Map(files.filter(f => f.project != null).map(f => [f.project!.id, f.project!])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const teams = Array.from(
    new Map(files.filter(f => f.team != null).map(f => [f.team!.id, f.team!])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const hasWorkspaceFiles = files.some(f => f.projectId == null && f.teamId == null);

  // Resolve current scope label
  const activeProject = projects.find(p => p.id === filters.scopeId);
  const activeTeam    = teams.find(t => t.id === filters.scopeId);
  const scopeLabel =
    filters.scopeId === 'workspace' ? 'Workspace'
    : activeProject                 ? activeProject.name
    : activeTeam                    ? activeTeam.name
    : 'All';

  const ScopeIcon =
    filters.scopeId === 'workspace' ? Building2
    : activeProject                 ? Briefcase
    : activeTeam                    ? Users
    : null;

  const currentSort = SORT_OPTIONS.find(s => s.value === filters.sort)!;

  // Active filter chips
  const chips: { label: string; clear: () => void }[] = [];
  if (filters.search)       chips.push({ label: `"${filters.search}"`,  clear: () => { setSearchDraft(''); set({ search: '' }); } });
  if (filters.type !== 'all') chips.push({ label: TYPE_CONFIG.find(t => t.key === filters.type)?.label ?? filters.type, clear: () => set({ type: 'all' }) });
  if (filters.scopeId)      chips.push({ label: scopeLabel,              clear: () => set({ scopeId: null }) });
  if (filters.sort !== 'newest') chips.push({ label: currentSort.label, clear: () => set({ sort: 'newest' }) });

  const showScopeDropdown = hasWorkspaceFiles || projects.length > 0 || teams.length > 0;

  return (
    <div className="space-y-3">

      {/* ── Row 1: search + scope + sort ───────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525b] pointer-events-none" />
          <input
            type="text"
            placeholder="Search files…"
            value={searchDraft}
            onChange={e => handleSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-7 bg-[#111113] border border-[#27272a] hover:border-[#3f3f46]
              focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/40
              rounded-md text-[12px] text-[#e4e4e7] placeholder-[#3f3f46] outline-none transition-colors"
          />
          {searchDraft && (
            <button onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Scope dropdown — workspace / project / team */}
        {showScopeDropdown && (
          <div ref={scopeRef} className="relative">
            <button
              onClick={() => { setScopeOpen(v => !v); setSortOpen(false); }}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-[11px] font-medium transition-colors
                ${filters.scopeId
                  ? 'bg-[#7c3aed]/15 border-[#7c3aed]/40 text-[#a78bfa]'
                  : 'bg-[#111113] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7]'
                }`}
            >
              {ScopeIcon && <ScopeIcon className="w-3 h-3" />}
              <span className="max-w-[120px] truncate">{scopeLabel}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${scopeOpen ? 'rotate-180' : ''}`} />
            </button>

            {scopeOpen && (
              <div className="absolute top-full mt-1 right-0 z-50 w-52
                bg-[#111113] border border-[#27272a] rounded-lg shadow-xl shadow-black/40
                py-1 animate-in fade-in zoom-in-95 duration-100">

                {/* All */}
                <button onClick={() => { set({ scopeId: null }); setScopeOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors
                    ${!filters.scopeId ? 'text-[#fafafa] bg-[#7c3aed]/15' : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'}`}>
                  All
                </button>

                {/* Workspace-only */}
                {hasWorkspaceFiles && (
                  <button onClick={() => { set({ scopeId: 'workspace' }); setScopeOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors
                      ${filters.scopeId === 'workspace' ? 'text-[#fafafa] bg-[#7c3aed]/15' : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'}`}>
                    <Building2 className="w-3 h-3 text-[#52525b]" />
                    <span className="flex-1 text-left">Workspace</span>
                    <span className="text-[9px] text-[#3f3f46]">no scope</span>
                  </button>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                      <div className="flex-1 h-px bg-[#1f1f23]" />
                      <span className="text-[9px] font-semibold text-[#3f3f46] uppercase tracking-widest">Projects</span>
                      <div className="flex-1 h-px bg-[#1f1f23]" />
                    </div>
                    {projects.map(p => (
                      <button key={p.id} onClick={() => { set({ scopeId: p.id }); setScopeOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors
                          ${filters.scopeId === p.id ? 'text-[#fafafa] bg-[#7c3aed]/15' : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'}`}>
                        <Briefcase className="w-3 h-3 text-[#52525b] flex-shrink-0" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-[9px] font-mono text-[#3f3f46]">{p.identifier}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Teams */}
                {teams.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                      <div className="flex-1 h-px bg-[#1f1f23]" />
                      <span className="text-[9px] font-semibold text-[#3f3f46] uppercase tracking-widest">Teams</span>
                      <div className="flex-1 h-px bg-[#1f1f23]" />
                    </div>
                    {teams.map(t => (
                      <button key={t.id} onClick={() => { set({ scopeId: t.id }); setScopeOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors
                          ${filters.scopeId === t.id ? 'text-[#fafafa] bg-[#7c3aed]/15' : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'}`}>
                        <Users className="w-3 h-3 text-[#52525b] flex-shrink-0" />
                        <span className="flex-1 truncate">{t.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sort */}
        <div ref={sortRef} className="relative">
          <button
            onClick={() => { setSortOpen(v => !v); setScopeOpen(false); }}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-[11px] font-medium transition-colors
              ${filters.sort !== 'newest'
                ? 'bg-[#7c3aed]/15 border-[#7c3aed]/40 text-[#a78bfa]'
                : 'bg-[#111113] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7]'
              }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {currentSort.label}
            <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 min-w-[160px]
              bg-[#111113] border border-[#27272a] rounded-lg shadow-xl shadow-black/40
              py-1 animate-in fade-in zoom-in-95 duration-100">
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { set({ sort: opt.value }); setSortOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors
                    ${filters.sort === opt.value ? 'text-[#fafafa] bg-[#7c3aed]/15' : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: type pills ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => set({ type: 'all' })}
          className={`flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold transition-colors border
            ${filters.type === 'all'
              ? 'bg-[#fafafa] text-[#09090b] border-[#fafafa]'
              : 'bg-transparent border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]'
            }`}>
          All
        </button>
        {TYPE_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const active = filters.type === key;
          return (
            <button key={key} onClick={() => set({ type: active ? 'all' : key })}
              className={`flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold transition-colors border
                ${active
                  ? 'bg-[#1f1f23] border-[#3f3f46] text-[#fafafa]'
                  : 'bg-transparent border-[#1f1f23] text-[#52525b] hover:border-[#27272a] hover:text-[#a1a1aa]'
                }`}>
              <Icon className={`w-2.5 h-2.5 ${active ? color : ''}`} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Row 3: active chips ────────────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#52525b]">Filters:</span>
          {chips.map(chip => (
            <span key={chip.label}
              className="inline-flex items-center gap-1 h-5 pl-2 pr-1 rounded-full
                bg-[#7c3aed]/15 border border-[#7c3aed]/30 text-[#a78bfa] text-[10px] font-medium">
              {chip.label}
              <button onClick={chip.clear} className="hover:text-[#fafafa] transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <button onClick={() => { setSearchDraft(''); onChange(DEFAULT_FILTERS); }}
            className="text-[10px] text-[#52525b] hover:text-[#a1a1aa] transition-colors ml-1">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ── applyFilters ──────────────────────────────────────────────────────────────

export function applyFilters(files: FileRecord[], filters: FileFilterState): FileRecord[] {
  let result = files;

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(f => f.filename.toLowerCase().includes(q));
  }

  if (filters.type !== 'all') {
    const cfg = TYPE_CONFIG.find(t => t.key === filters.type);
    if (cfg) result = result.filter(f => cfg.match(f.contentType));
  }

  if (filters.scopeId === 'workspace') {
    result = result.filter(f => f.projectId == null && f.teamId == null);
  } else if (filters.scopeId) {
    // Could be a project id or a team id
    result = result.filter(f =>
      f.projectId === filters.scopeId || f.teamId === filters.scopeId,
    );
  }

  result = [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'oldest':    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name_asc':  return a.filename.localeCompare(b.filename);
      case 'name_desc': return b.filename.localeCompare(a.filename);
      case 'size_desc': return Number(b.sizeBytes) - Number(a.sizeBytes);
      case 'size_asc':  return Number(a.sizeBytes) - Number(b.sizeBytes);
      default:          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return result;
}
