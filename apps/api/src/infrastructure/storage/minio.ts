/**
 * MinIO / S3-compatible storage client.
 *
 * Uses the AWS SDK v3 S3 client pointed at MinIO.
 * Swap MINIO_ENDPOINT + credentials in .env to migrate to AWS S3 or
 * Cloudflare R2 with zero code changes.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Client singleton ──────────────────────────────────────────────────────────

const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
const port = Number(process.env.MINIO_PORT ?? 9000);
const useSSL = process.env.MINIO_USE_SSL === 'true';
const protocol = useSSL ? 'https' : 'http';

/** Internal endpoint the SDK connects to (may be a Docker service name). */
const internalEndpoint = `${protocol}://${endpoint}:${port}`;

/**
 * Optional public base URL rewritten into every presigned URL before it is
 * sent to the browser.  Required when:
 *  - MinIO runs on an internal hostname (e.g. Docker service "minio"), OR
 *  - The app is served over HTTPS (browser blocks mixed http:// requests).
 *
 * Example value: https://minio.sanctyr.cloud
 */
const publicUrl = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '') ?? null;

export const s3 = new S3Client({
  endpoint: internalEndpoint,
  region: 'us-east-1', // MinIO ignores region but the SDK requires one
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
  // Required for MinIO path-style URLs  (vs virtual-hosted style on AWS)
  forcePathStyle: true,
});

export const BUCKET = process.env.MINIO_BUCKET ?? 'realm-files';

// ── URL rewriter ──────────────────────────────────────────────────────────────

/**
 * Replace the internal MinIO origin in a presigned URL with the public URL.
 *
 * The AWS SDK signs the URL using the internal endpoint.  If MINIO_PUBLIC_URL
 * is set we swap the origin so the browser hits the public host instead of
 * the Docker-internal one (which it cannot reach and which would also trigger
 * a mixed-content block when the app is served over HTTPS).
 *
 * The HMAC signature stays valid because MinIO / S3 signs the path + query
 * string, not the host header, so changing the host in the URL is safe as
 * long as the MinIO server accepts requests on that public hostname too.
 */
function rewriteToPublicUrl(presignedUrl: string): string {
  if (!publicUrl) return presignedUrl;

  const parsed = new URL(presignedUrl);
  const target = new URL(publicUrl);

  parsed.protocol = target.protocol;
  parsed.hostname = target.hostname;
  parsed.port = target.port; // '' if the public URL has no explicit port

  return parsed.toString();
}

// ── Presigned upload URL ──────────────────────────────────────────────────────

export interface PresignedUploadResult {
  /** PUT this URL directly from the browser — no API server in the loop */
  uploadUrl: string;
  /** The object key to reference the file permanently in the database */
  storageKey: string;
}

/**
 * Generate a presigned PUT URL.
 * The client uploads directly to MinIO; the API never receives file bytes.
 *
 * @param storageKey  - Unique object key, e.g. "workspaces/abc/files/xyz.pdf"
 * @param contentType - MIME type declared by the client, e.g. "application/pdf"
 * @param expiresIn   - Seconds until the URL expires (default 5 minutes)
 */
export async function createPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  expiresIn = 300
): Promise<PresignedUploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });

  const uploadUrl = rewriteToPublicUrl(
    await getSignedUrl(s3, command, { expiresIn })
  );
  return { uploadUrl, storageKey };
}

// ── Presigned download URL ────────────────────────────────────────────────────

import { GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Generate a presigned GET URL for downloading / previewing a file.
 *
 * @param storageKey - The object key stored in the database
 * @param expiresIn  - Seconds until the URL expires (default 1 hour)
 */
export async function createPresignedDownloadUrl(
  storageKey: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });

  return rewriteToPublicUrl(await getSignedUrl(s3, command, { expiresIn }));
}

// ── Delete object ─────────────────────────────────────────────────────────────

/**
 * Hard-delete an object from MinIO.
 * Call this after soft-deleting the FileRecord or during cleanup jobs.
 */
export async function deleteObject(storageKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}

// ── Verify object exists ──────────────────────────────────────────────────────

/**
 * Confirm an upload completed successfully by checking object existence.
 * Used in the "confirm upload" endpoint before creating the database record.
 */
export async function objectExists(storageKey: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    return true;
  } catch {
    return false;
  }
}

// ── Storage key factory ───────────────────────────────────────────────────────

/**
 * Build a deterministic, collision-free storage key.
 * Pattern: workspaces/{workspaceId}/files/{uuid}/{filename}
 */
export function buildStorageKey(
  workspaceId: string,
  fileId: string,
  filename: string
): string {
  // Sanitise filename: strip path separators and control chars
  const safe = filename.replace(/[/\\?%*:|"<>]/g, '_');
  return `workspaces/${workspaceId}/files/${fileId}/${safe}`;
}
