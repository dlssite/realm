// ── Files module — UI types ───────────────────────────────────────────────────

export interface FileUploader {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface FileProject {
  id: string;
  name: string;
  identifier: string;
}

export interface FileRecord {
  id: string;
  createdAt: string;
  filename: string;
  contentType: string;
  /** BigInt serialised as string from the API */
  sizeBytes: string;
  projectId: string | null;
  project: FileProject | null;
  uploadedBy: FileUploader;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  storageKey: string;
  fileId: string;
}

export interface ConfirmUploadPayload {
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  projectId?: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  filename: string;
  contentType: string;
}

/** What the upload panel tracks per in-flight file */
export interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'confirming' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
}
