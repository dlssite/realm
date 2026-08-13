import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useToast } from '../../../shared/hooks/use-toast';
import { listFiles, deleteFile } from '../api/files-api';
import { listProjects } from '../../projects/api/projects-api';
import { listTeams } from '../../teams/api/teams-api';
import { FileUploadZone } from '../components/file-upload-zone';
import { FileList } from '../components/file-list';
import {
  FileFilters, FileFilterState, DEFAULT_FILTERS, applyFilters,
} from '../components/file-filters';
import type { FileRecord } from '../types';
import type { UploadProject, UploadTeam } from '../components/file-upload-zone';

export function FilesPage() {
  const { token, workspace, user } = useAuthStore();
  const { toast } = useToast();

  const [files,      setFiles]      = useState<FileRecord[]>([]);
  const [projects,   setProjects]   = useState<UploadProject[]>([]);
  const [teams,      setTeams]      = useState<UploadTeam[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [filters,    setFilters]    = useState<FileFilterState>(DEFAULT_FILTERS);

  const isAdmin = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  // ── Load files + projects + teams in parallel ──────────────────────────────
  const loadData = useCallback(async () => {
    if (!token || !workspace) return;
    setLoading(true);
    try {
      const [fileData, projectData, teamData] = await Promise.all([
        listFiles(token, workspace.id),
        listProjects(token, workspace.id),
        listTeams(token, workspace.id),
      ]);

      setFiles(fileData);
      setProjects(
        projectData
          .filter(p => p.deletedAt == null)
          .map(p => ({ id: p.id, name: p.name, identifier: p.identifier }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setTeams(
        teamData
          .map(t => ({ id: t.id, name: t.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      setFetchError('Could not load files. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [token, workspace]);

  useEffect(() => { loadData(); }, [loadData]);

  const visibleFiles = useMemo(() => applyFilters(files, filters), [files, filters]);

  const handleUploaded = useCallback((file: FileRecord) => {
    setFiles(prev => [file, ...prev]);
    toast.success('File uploaded', file.filename);
  }, [toast]);

  const handleDelete = async (fileId: string) => {
    if (!token || !workspace) return;
    setDeleting(fileId);
    try {
      await deleteFile(token, workspace.id, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.info('File deleted');
    } catch {
      toast.error('Failed to delete file', 'You may not have permission to delete this file.');
    } finally {
      setDeleting(null);
    }
  };

  const countLabel = loading ? '—' : (
    visibleFiles.length === files.length
      ? `${files.length} ${files.length === 1 ? 'file' : 'files'}`
      : `${visibleFiles.length} of ${files.length} files`
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#1f1f23]">
        <FolderOpen className="w-6 h-6 text-[#fb923c]" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#fafafa]">Files</h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Workspace asset management — upload, preview, and manage files
          </p>
        </div>
        <div className="ml-auto text-xs text-[#52525b]">{countLabel}</div>
      </div>

      {/* Upload zone — project + team picker built in */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525b] mb-3">
          Upload Files
        </p>
        <FileUploadZone
          onUploaded={handleUploaded}
          projects={projects}
          teams={teams}
        />
      </section>

      <div className="border-t border-[#1f1f23]" />

      {/* Filter bar + file list */}
      <section className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525b]">
          {isAdmin ? 'All Files' : 'Files You Can Access'}
        </p>

        {!loading && !fetchError && files.length > 0 && (
          <FileFilters files={files} filters={filters} onChange={setFilters} />
        )}

        {loading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
          </div>
        )}

        {!loading && fetchError && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[#f87171]">{fetchError}</p>
          </div>
        )}

        {!loading && !fetchError && (
          <>
            {visibleFiles.length === 0 && files.length > 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-sm text-[#52525b]">No files match your filters</p>
                <button onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-xs text-[#7c3aed] hover:text-[#a78bfa] transition-colors">
                  Clear filters
                </button>
              </div>
            )}
            {(visibleFiles.length > 0 || files.length === 0) && (
              <FileList
                files={visibleFiles}
                currentUserId={user?.id ?? ''}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                deleting={deleting}
              />
            )}
          </>
        )}
      </section>

    </div>
  );
}

export default FilesPage;
