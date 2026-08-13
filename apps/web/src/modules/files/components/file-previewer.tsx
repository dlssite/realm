/**
 * FilePreviewer — in-app viewer for images, PDFs, video, and code/text files.
 * Opens in a modal overlay. For unsupported types it falls back to a download button.
 */

import React, { useEffect, useState } from 'react';
import { X, Download, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../app/stores/auth.store';
import { getDownloadUrl } from '../api/files-api';
import { FileIcon, formatFileSize } from './file-icon';
import type { FileRecord } from '../types';

interface FilePreviewerProps {
  file: FileRecord;
  onClose: () => void;
}

export function FilePreviewer({ file, onClose }: FilePreviewerProps) {
  const { token, workspace } = useAuthStore();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !workspace) return;
    setLoading(true);
    getDownloadUrl(token, workspace.id, file.id)
      .then((res) => setUrl(res.downloadUrl))
      .catch(() => setError('Could not load preview URL.'))
      .finally(() => setLoading(false));
  }, [token, workspace, file.id]);

  const isImage = file.contentType.startsWith('image/');
  const isVideo = file.contentType.startsWith('video/');
  const isPdf = file.contentType === 'application/pdf';
  const isText =
    file.contentType.startsWith('text/') ||
    file.contentType.includes('json') ||
    file.contentType.includes('xml') ||
    file.contentType.includes('javascript') ||
    file.contentType.includes('typescript');

  const canPreview = isImage || isVideo || isPdf || isText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0c0e] border border-[#1f1f23] rounded-xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#1f1f23] flex-shrink-0">
          <FileIcon contentType={file.contentType} className="w-4 h-4" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#fafafa] truncate">{file.filename}</p>
            <p className="text-xs text-[#52525b]">
              {formatFileSize(file.sizeBytes)} · {file.contentType}
            </p>
          </div>
          {url && (
            <a
              href={url}
              download={file.filename}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1f1f23] hover:bg-[#27272a] text-[#a1a1aa] text-xs rounded-md transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#1f1f23] text-[#71717a] hover:text-[#fafafa] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto min-h-0 flex items-center justify-center bg-[#09090b]">
          {loading && (
            <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-center p-8">
              <AlertCircle className="w-8 h-8 text-[#f87171]" />
              <p className="text-sm text-[#f87171]">{error}</p>
            </div>
          )}

          {!loading && !error && url && (
            <>
              {isImage && (
                <img
                  src={url}
                  alt={file.filename}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}

              {isVideo && (
                <video
                  src={url}
                  controls
                  className="max-w-full max-h-[70vh]"
                >
                  Your browser does not support video playback.
                </video>
              )}

              {isPdf && (
                <iframe
                  src={url}
                  title={file.filename}
                  className="w-full h-[70vh] border-0"
                />
              )}

              {isText && !isImage && !isVideo && !isPdf && (
                <TextFilePreview url={url} />
              )}

              {!canPreview && (
                <div className="flex flex-col items-center gap-4 p-12 text-center">
                  <FileIcon contentType={file.contentType} className="w-12 h-12" />
                  <p className="text-sm text-[#a1a1aa]">
                    Preview not available for this file type.
                  </p>
                  <a
                    href={url}
                    download={file.filename}
                    className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Text file renderer ────────────────────────────────────────────────────────

function TextFilePreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent('Could not load file content.'))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />;

  return (
    <pre className="w-full h-[70vh] overflow-auto p-6 text-xs text-[#a1a1aa] font-mono whitespace-pre-wrap break-words">
      {content}
    </pre>
  );
}
