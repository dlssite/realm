/**
 * FileList — renders the workspace file table with preview + delete actions.
 */

import React, { useState } from 'react';
import { Eye, Trash2, FolderOpen } from 'lucide-react';
import { FileIcon, formatFileSize } from './file-icon';
import { FilePreviewer } from './file-previewer';
import type { FileRecord } from '../types';

interface FileListProps {
  files: FileRecord[];
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (fileId: string) => void;
  deleting: string | null;
}

export function FileList({
  files,
  currentUserId,
  isAdmin,
  onDelete,
  deleting,
}: FileListProps) {
  const [previewing, setPreviewing] = useState<FileRecord | null>(null);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <FolderOpen className="w-10 h-10 text-[#27272a]" />
        <p className="text-sm text-[#52525b]">No files uploaded yet</p>
        <p className="text-xs text-[#3f3f46]">Upload your first file using the panel above</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block border border-[#1f1f23] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_140px_120px_100px] gap-4 items-center px-4 py-2.5 bg-[#0c0c0e] border-b border-[#1f1f23]">
          <span className="w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">Name</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">Uploaded by</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b]">Size</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#52525b] text-right">Actions</span>
        </div>
        {/* Rows */}
        <div className="divide-y divide-[#1f1f23]">
          {files.map((file) => {
            const canDelete = file.uploadedBy.id === currentUserId || isAdmin;
            const isDeleting = deleting === file.id;
            return (
              <div
                key={file.id}
                className="grid grid-cols-[auto_1fr_140px_120px_100px] gap-4 items-center px-4 py-3 hover:bg-[#111113] transition-colors group"
              >
                <FileIcon contentType={file.contentType} className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-[#e4e4e7] truncate font-medium">{file.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#52525b]">
                      {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {file.project && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#1f1f23] text-[#71717a] border border-[#27272a]">
                        {file.project.identifier}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#71717a] truncate">{file.uploadedBy.name}</p>
                <p className="text-xs text-[#71717a]">{formatFileSize(file.sizeBytes)}</p>
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => setPreviewing(file)} title="Preview"
                    className="flex items-center justify-center w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-all">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canDelete && (
                    <button onClick={() => !isDeleting && onDelete(file.id)} disabled={isDeleting} title="Delete"
                      className="flex items-center justify-center w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#27171a] text-[#71717a] hover:text-[#f87171] disabled:opacity-40 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden border border-[#1f1f23] rounded-lg overflow-hidden divide-y divide-[#1f1f23]">
        {files.map((file) => {
          const canDelete = file.uploadedBy.id === currentUserId || isAdmin;
          const isDeleting = deleting === file.id;
          return (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 bg-[#0c0c0e] hover:bg-[#111113] transition-colors">
              {/* Icon */}
              <FileIcon contentType={file.contentType} className="w-5 h-5 flex-shrink-0 text-[#71717a]" />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#e4e4e7] font-medium truncate">{file.filename}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-[#52525b]">
                    {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-[#71717a]">{formatFileSize(file.sizeBytes)}</span>
                  <span className="text-[10px] text-[#71717a]">{file.uploadedBy.name}</span>
                  {file.project && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1f1f23] text-[#71717a] border border-[#27272a]">
                      {file.project.identifier}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions — always visible on mobile (no hover needed) */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setPreviewing(file)} title="Preview"
                  className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#27272a] text-[#71717a] hover:text-[#fafafa] transition-all">
                  <Eye className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button onClick={() => !isDeleting && onDelete(file.id)} disabled={isDeleting} title="Delete"
                    className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[#27171a] text-[#71717a] hover:text-[#f87171] disabled:opacity-40 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Previewer modal */}
      {previewing && (
        <FilePreviewer file={previewing} onClose={() => setPreviewing(null)} />
      )}
    </>
  );
}
