/**
 * FileIcon — maps a MIME type to a coloured Lucide icon.
 */

import React from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileCode,
  FileArchive,
  File,
} from 'lucide-react';

interface FileIconProps {
  contentType: string;
  className?: string;
}

export function FileIcon({ contentType, className = 'w-5 h-5' }: FileIconProps) {
  if (contentType.startsWith('image/')) {
    return <FileImage className={`${className} text-[#34d399]`} />;
  }
  if (contentType.startsWith('video/')) {
    return <FileVideo className={`${className} text-[#60a5fa]`} />;
  }
  if (contentType === 'application/pdf') {
    return <FileText className={`${className} text-[#f87171]`} />;
  }
  if (
    contentType.startsWith('text/') ||
    contentType.includes('javascript') ||
    contentType.includes('typescript') ||
    contentType.includes('json') ||
    contentType.includes('xml')
  ) {
    return <FileCode className={`${className} text-[#a78bfa]`} />;
  }
  if (
    contentType.includes('zip') ||
    contentType.includes('tar') ||
    contentType.includes('gzip') ||
    contentType.includes('compressed')
  ) {
    return <FileArchive className={`${className} text-[#fb923c]`} />;
  }
  return <File className={`${className} text-[#71717a]`} />;
}

/** Format sizeBytes (string from API) into human-readable string */
export function formatFileSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
