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

export interface FileTeam {
  id: string;
  name: string;
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
  teamId: string | null;
  team: FileTeam | null;
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
  teamId?: string;
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
