/**
 * FileUploadZone — drag-and-drop + click-to-browse upload panel.
 *
 * Handles the full 3-step presign → PUT → confirm flow per file.
 * The scope picker lets the user tag uploads to:
 *   • Workspace  (no project / no team — workspace-wide)
 *   • A project  (projectId stored on FileRecord)
 *   • A team     (teamId stored on FileRecord)
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Upload, X, CheckCircle2, AlertCircle, Loader2,
  ChevronDown, Briefcase, Building2, Users,
} from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { requestUploadUrl, uploadToStorage, confirmUpload } from '../api/files-api';
import type { FileRecord, UploadItem } from '../types';

export interface UploadProject { id: string; name: string; identifier: string; }
export interface UploadTeam    { id: string; name: string; }

// What scope the user selected
type ScopeType = 'workspace' | 'project' | 'team';
interface Scope {
  type:      ScopeType;
  id:        string | null; // null when workspace
  label:     string;
}

const WORKSPACE_SCOPE: Scope = { type: 'workspace', id: null, label: 'Workspace' };

interface FileUploadZoneProps {
  onUploaded: (file: FileRecord) => void;
  projects?:  UploadProject[];
  teams?:     UploadTeam[];
}

export function FileUploadZone({
  onUploaded,
  projects = [],
  teams    = [],
}: FileUploadZoneProps) {
  const { token, workspace } = useAuthStore();
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dragging,  setDragging]  = useState(false);
  const [items,     setItems]     = useState<UploadItem[]>([]);
  const [scope,     setScope]     = useState<Scope>(WORKSPACE_SCOPE);
  const [dropOpen,  setDropOpen]  = useState(false);

  // Close dropdown on outside click
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const updateItem = (id: string, patch: Partial<UploadItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const processFile = useCallback(async (file: File) => {
    if (!token || !workspace) return;
    const id = `${Date.now()}-${Math.random()}`;
    setItems(prev => [...prev, { id, file, status: 'pending', progress: 0 }]);

    try {
      updateItem(id, { status: 'uploading' });
      const { uploadUrl, storageKey } = await requestUploadUrl(
        token, workspace.id, file.name,
        file.type || 'application/octet-stream',
        scope.type === 'project' ? scope.id ?? undefined : undefined,
      );

      await uploadToStorage(uploadUrl, file, pct => updateItem(id, { progress: pct }));

      updateItem(id, { status: 'confirming', progress: 100 });
      const record = await confirmUpload(token, workspace.id, {
        storageKey,
        filename:    file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes:   file.size,
        ...(scope.type === 'project' && scope.id != null ? { projectId: scope.id } : {}),
        ...(scope.type === 'team'    && scope.id != null ? { teamId:    scope.id } : {}),
      });

      updateItem(id, { status: 'done' });
      onUploaded(record);
      setTimeout(() => setItems(prev => prev.filter(it => it.id !== id)), 3000);
    } catch (err) {
      updateItem(id, { status: 'error', errorMessage: err instanceof Error ? err.message : 'Upload failed' });
    }
  }, [token, workspace, onUploaded, scope]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const pickScope = (s: Scope) => { setScope(s); setDropOpen(false); };

  const hasOptions = projects.length > 0 || teams.length > 0;

  return (
    <div className="space-y-3">

      {/* ── Scope picker ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#52525b] flex-shrink-0">Link to:</span>

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropOpen(v => !v)}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px]
              font-medium transition-colors
              ${scope.type !== 'workspace'
                ? 'bg-[#7c3aed]/15 border-[#7c3aed]/40 text-[#a78bfa]'
                : 'bg-[#111113] border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]'
              }`}
          >
            {scope.type === 'project' && <Briefcase className="w-3 h-3" />}
            {scope.type === 'team'    && <Users     className="w-3 h-3" />}
            {scope.type === 'workspace' && <Building2 className="w-3 h-3" />}
            <span className="max-w-[140px] truncate">{scope.label}</span>
            <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropOpen && (
            <div className="absolute top-full mt-1 left-0 z-50 w-56
              bg-[#111113] border border-[#27272a] rounded-lg shadow-xl shadow-black/50
              py-1 animate-in fade-in zoom-in-95 duration-100">

              {/* Workspace */}
              <button
                type="button"
                onClick={() => pickScope(WORKSPACE_SCOPE)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors
                  ${scope.type === 'workspace'
                    ? 'bg-[#7c3aed]/15 text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'
                  }`}
              >
                <Building2 className="w-3 h-3 text-[#52525b] flex-shrink-0" />
                <span className="flex-1 text-left">Workspace</span>
                <span className="text-[9px] text-[#3f3f46]">no project</span>
              </button>

              {/* Projects section */}
              {projects.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                    <div className="flex-1 h-px bg-[#1f1f23]" />
                    <span className="text-[9px] font-semibold text-[#3f3f46] uppercase tracking-widest">
                      Projects
                    </span>
                    <div className="flex-1 h-px bg-[#1f1f23]" />
                  </div>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickScope({ type: 'project', id: p.id, label: p.name })}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors
                        ${scope.type === 'project' && scope.id === p.id
                          ? 'bg-[#7c3aed]/15 text-[#fafafa]'
                          : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'
                        }`}
                    >
                      <Briefcase className="w-3 h-3 text-[#52525b] flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{p.name}</span>
                      <span className="text-[9px] font-mono text-[#3f3f46]">{p.identifier}</span>
                    </button>
                  ))}
                </>
              )}

              {/* Teams section */}
              {teams.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                    <div className="flex-1 h-px bg-[#1f1f23]" />
                    <span className="text-[9px] font-semibold text-[#3f3f46] uppercase tracking-widest">
                      Teams
                    </span>
                    <div className="flex-1 h-px bg-[#1f1f23]" />
                  </div>
                  {teams.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickScope({ type: 'team', id: t.id, label: t.name })}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors
                        ${scope.type === 'team' && scope.id === t.id
                          ? 'bg-[#7c3aed]/15 text-[#fafafa]'
                          : 'text-[#a1a1aa] hover:bg-[#1a1a1e] hover:text-[#fafafa]'
                        }`}
                    >
                      <Users className="w-3 h-3 text-[#52525b] flex-shrink-0" />
                      <span className="flex-1 text-left truncate">{t.name}</span>
                    </button>
                  ))}
                </>
              )}

              {!hasOptions && (
                <p className="px-3 py-2 text-[10px] text-[#52525b] italic">
                  No projects or teams available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Clear scope back to workspace */}
        {scope.type !== 'workspace' && (
          <button
            type="button"
            onClick={() => setScope(WORKSPACE_SCOPE)}
            className="text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            title="Clear scope"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Drop zone ────────────────────────────────────────────────────── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 p-8 rounded-lg
          border-2 border-dashed cursor-pointer transition-colors
          ${dragging
            ? 'border-[#7c3aed] bg-[#7c3aed]/5'
            : 'border-[#27272a] bg-[#0c0c0e] hover:border-[#3f3f46] hover:bg-[#111113]'
          }`}
      >
        <Upload className="w-8 h-8 text-[#52525b]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[#a1a1aa]">
            Drop files here or <span className="text-[#7c3aed]">browse</span>
          </p>
          <p className="text-xs text-[#52525b] mt-0.5">
            {scope.type !== 'workspace'
              ? <>Will tag to <span className="text-[#a78bfa]">{scope.label}</span></>
              : 'Workspace-wide — not linked to any project or team'
            }
          </p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* ── Upload progress list ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id}
              className="flex items-center gap-3 px-3 py-2 bg-[#111113] border border-[#1f1f23] rounded-md">
              {item.status === 'done'  && <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0" />}
              {item.status === 'error' && <AlertCircle  className="w-4 h-4 text-[#f87171] flex-shrink-0" />}
              {['uploading','confirming','pending'].includes(item.status) &&
                <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin flex-shrink-0" />}

              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#e4e4e7] truncate">{item.file.name}</p>
                {item.status === 'error' && (
                  <p className="text-xs text-[#f87171]">{item.errorMessage}</p>
                )}
                {item.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-[#27272a] rounded-full overflow-hidden">
                    <div className="h-full bg-[#7c3aed] transition-all duration-200"
                      style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>

              {item.status === 'error' && (
                <button type="button"
                  onClick={() => setItems(p => p.filter(it => it.id !== item.id))}
                  className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
