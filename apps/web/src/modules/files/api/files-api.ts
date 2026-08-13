import { API_BASE } from '@/lib/api';
/**
 * Files API client.
 * Upload flow: requestUploadUrl → PUT to MinIO directly → confirmUpload → record in DB.
 */

import type {
  FileRecord,
  PresignedUploadResponse,
  ConfirmUploadPayload,
  DownloadUrlResponse,
} from '../types';

const BASE = (workspaceId: string) =>
  `${API_BASE}/api/v1/workspaces/${workspaceId}/files`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** Step 1 — ask the API for a presigned PUT URL */
export async function requestUploadUrl(
  token: string,
  workspaceId: string,
  filename: string,
  contentType: string,
  projectId?: string
): Promise<PresignedUploadResponse> {
  const res = await fetch(`${BASE(workspaceId)}/upload-url`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ filename, contentType, projectId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to get upload URL');
  return data as PresignedUploadResponse;
}

/** Step 2 — PUT file bytes directly to MinIO (no auth header — URL is pre-signed) */
export async function uploadToStorage(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

/** Step 3 — tell the API the upload is done, create the DB record */
export async function confirmUpload(
  token: string,
  workspaceId: string,
  payload: ConfirmUploadPayload
): Promise<FileRecord> {
  const res = await fetch(`${BASE(workspaceId)}/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to confirm upload');
  return data as FileRecord;
}

/** List workspace files, optionally filtered by projectId */
export async function listFiles(
  token: string,
  workspaceId: string,
  projectId?: string
): Promise<FileRecord[]> {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);

  const res = await fetch(`${BASE(workspaceId)}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load files');
  return data as FileRecord[];
}

/** Get a short-lived presigned download URL for previewing / downloading */
export async function getDownloadUrl(
  token: string,
  workspaceId: string,
  fileId: string
): Promise<DownloadUrlResponse> {
  const res = await fetch(`${BASE(workspaceId)}/${fileId}/download-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to get download URL');
  return data as DownloadUrlResponse;
}

/** Soft-delete file record + hard-delete from MinIO */
export async function deleteFile(
  token: string,
  workspaceId: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete file');
  }
}
