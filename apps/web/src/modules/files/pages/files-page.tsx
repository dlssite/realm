/**
 * FilesPage — workspace asset management.
 * Replaces the Coming Soon placeholder.
 *
 * Features:
 *   - Drag-and-drop / click-to-browse upload (presign → MinIO → confirm)
 *   - In-app previewer for images, PDFs, video, code files
 *   - Delete with permission guard (uploader or admin)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { useToast } from '../../../shared/hooks/use-toast';
import { listFiles, deleteFile } from '../api/files-api';
import { FileUploadZone } from '../components/file-upload-zone';
import { FileList } from '../components/file-list';
import type { FileRecord } from '../types';

export function FilesPage() {
  const { token, workspace, user } = useAuthStore();
  const { toast } = useToast();

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Derive whether current user has admin-level delete rights
  // (Full RBAC is enforced server-side; this just controls UI visibility)
  const isAdmin = false; // expanded when workspace role is available in auth store

  // ── Load files ─────────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    if (!token || !workspace) return;
    try {
      const data = await listFiles(token, workspace.id);
      setFiles(data);
    } catch {
      setFetchError('Could not load files. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [token, workspace]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // ── Handle new upload completing ───────────────────────────────────────────
  const handleUploaded = useCallback((file: FileRecord) => {
    setFiles((prev) => [file, ...prev]);
    toast.success('File uploaded', file.filename);
  }, []);

  // ── Handle delete ──────────────────────────────────────────────────────────
  const handleDelete = async (fileId: string) => {
    if (!token || !workspace) return;
    setDeleting(fileId);
    try {
      await deleteFile(token, workspace.id, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.info('File deleted');
    } catch {
      toast.error('Failed to delete file', 'You may not have permission to delete this file.');
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#1f1f23]">
        <FolderOpen className="w-6 h-6 text-[#fb923c]" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#fafafa]">Files</h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            Workspace asset management — upload, preview, and manage files
          </p>
        </div>
        <div className="ml-auto text-xs text-[#52525b]">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {/* Upload zone */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525b] mb-3">
          Upload Files
        </p>
        <FileUploadZone onUploaded={handleUploaded} />
      </section>

      {/* Divider */}
      <div className="border-t border-[#1f1f23]" />

      {/* File list */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525b] mb-3">
          All Files
        </p>

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
          <FileList
            files={files}
            currentUserId={user?.id ?? ''}
            isAdmin={isAdmin}
            onDelete={handleDelete}
            deleting={deleting}
          />
        )}
      </section>

    </div>
  );
}

export default FilesPage;
