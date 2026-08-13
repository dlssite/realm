// ── Files module DTOs ─────────────────────────────────────────────────────────

export interface FileUploaderDto {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface FileProjectDto {
  id: string;
  name: string;
  identifier: string;
}

export interface FileRecordDto {
  id: string;
  createdAt: string;
  filename: string;
  contentType: string;
  /** String representation of BigInt bytes */
  sizeBytes: string;
  projectId: string | null;
  project: FileProjectDto | null;
  uploadedBy: FileUploaderDto;
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
