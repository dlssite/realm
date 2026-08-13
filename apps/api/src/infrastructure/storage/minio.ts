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
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Endpoints ─────────────────────────────────────────────────────────────────

const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
const port     = Number(process.env.MINIO_PORT ?? 9000);
const useSSL   = process.env.MINIO_USE_SSL === 'true';
const protocol = useSSL ? 'https' : 'http';

/** Internal endpoint — used for all non-presign operations (put, delete, head). */
const internalEndpoint = `${protocol}://${endpoint}:${port}`;

/**
 * MINIO_PUBLIC_URL, e.g. https://realm.sanctyr.cloud/storage
 *
 * When set, presigned URLs are generated using this endpoint directly so
 * the browser receives a URL that:
 *  a) resolves publicly (no internal Docker hostname), and
 *  b) has its HMAC computed against the correct host — avoiding the 403
 *     that occurs when you sign with one host and send to another.
 *
 * Caddy proxies  /storage/*  →  minio:9000  (stripping the /storage prefix),
 * so MinIO receives the original path and validates the signature correctly.
 */
const publicUrl = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '') ?? null;

// ── S3 clients ────────────────────────────────────────────────────────────────

/** Used for server-side operations: delete, head, etc. */
export const s3 = new S3Client({
  endpoint: internalEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
});

/**
 * Used exclusively for generating presigned URLs.
 * When MINIO_PUBLIC_URL is set, signs against the public endpoint so the
 * HMAC host matches what the browser sends — no post-signing URL rewriting
 * needed, and no signature mismatch / 403.
 */
const s3Presign = publicUrl
  ? new S3Client({
      endpoint: publicUrl,
      region: 'us-east-1',
      credentials: {
        accessKeyId:     process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: true,
    })
  : s3; // fallback: same client when no public URL configured

export const BUCKET = process.env.MINIO_BUCKET ?? 'realm-files';

// ── Presigned upload URL ──────────────────────────────────────────────────────

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
}

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

  const uploadUrl = await getSignedUrl(s3Presign, command, { expiresIn });
  return { uploadUrl, storageKey };
}

// ── Presigned download URL ────────────────────────────────────────────────────

export async function createPresignedDownloadUrl(
  storageKey: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  });

  return getSignedUrl(s3Presign, command, { expiresIn });
}

// ── Delete object ─────────────────────────────────────────────────────────────

export async function deleteObject(storageKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}

// ── Verify object exists ──────────────────────────────────────────────────────

export async function objectExists(storageKey: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: storageKey }));
    return true;
  } catch {
    return false;
  }
}

// ── Storage key factory ───────────────────────────────────────────────────────

export function buildStorageKey(
  workspaceId: string,
  fileId: string,
  filename: string
): string {
  const safe = filename.replace(/[/\\?%*:|"<>]/g, '_');
  return `workspaces/${workspaceId}/files/${fileId}/${safe}`;
}
