/**
 * FileUploadZone — drag-and-drop + click-to-browse upload panel.
 * Handles the full 3-step presign → PUT → confirm flow per file.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import {
  requestUploadUrl,
  uploadToStorage,
  confirmUpload,
} from '../api/files-api';
import type { FileRecord, UploadItem } from '../types';

interface FileUploadZoneProps {
  onUploaded: (file: FileRecord) => void;
}

export function FileUploadZone({ onUploaded }: FileUploadZoneProps) {
  const { token, workspace } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  const processFile = useCallback(
    async (file: File) => {
      if (!token || !workspace) return;

      const id = `${Date.now()}-${Math.random()}`;
      const item: UploadItem = { id, file, status: 'pending', progress: 0 };
      setItems((prev) => [...prev, item]);

      try {
        // Step 1 — get presigned URL
        updateItem(id, { status: 'uploading' });
        const { uploadUrl, storageKey } = await requestUploadUrl(
          token,
          workspace.id,
          file.name,
          file.type || 'application/octet-stream'
        );

        // Step 2 — PUT directly to MinIO
        await uploadToStorage(uploadUrl, file, (pct) =>
          updateItem(id, { progress: pct })
        );

        // Step 3 — confirm with API
        updateItem(id, { status: 'confirming', progress: 100 });
        const record = await confirmUpload(token, workspace.id, {
          storageKey,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });

        updateItem(id, { status: 'done' });
        onUploaded(record);

        // Auto-clear completed item after 3 s
        setTimeout(() => setItems((prev) => prev.filter((it) => it.id !== id)), 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        updateItem(id, { status: 'error', errorMessage: msg });
      }
    },
    [token, workspace, onUploaded]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-3 p-8 rounded-lg border-2 border-dashed
          cursor-pointer transition-colors
          ${dragging
            ? 'border-[#7c3aed] bg-[#7c3aed]/5'
            : 'border-[#27272a] bg-[#0c0c0e] hover:border-[#3f3f46] hover:bg-[#111113]'
          }
        `}
      >
        <Upload className="w-8 h-8 text-[#52525b]" />
        <div className="text-center">
          <p className="text-sm font-medium text-[#a1a1aa]">
            Drop files here or <span className="text-[#7c3aed]">browse</span>
          </p>
          <p className="text-xs text-[#52525b] mt-0.5">
            Images, PDFs, videos, code files — any format
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload progress list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 bg-[#111113] border border-[#1f1f23] rounded-md"
            >
              {/* Status icon */}
              {item.status === 'done' && (
                <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
              )}
              {item.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-[#f87171] flex-shrink-0" />
              )}
              {(item.status === 'uploading' || item.status === 'confirming' || item.status === 'pending') && (
                <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin flex-shrink-0" />
              )}

              {/* Filename + progress */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#e4e4e7] truncate">{item.file.name}</p>
                {item.status === 'error' && (
                  <p className="text-xs text-[#f87171]">{item.errorMessage}</p>
                )}
                {(item.status === 'uploading') && (
                  <div className="mt-1 h-1 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7c3aed] transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Dismiss error */}
              {item.status === 'error' && (
                <button
                  onClick={() => setItems((p) => p.filter((it) => it.id !== item.id))}
                  className="text-[#52525b] hover:text-[#a1a1aa]"
                >
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
