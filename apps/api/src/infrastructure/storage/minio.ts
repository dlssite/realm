/**
 * MinIO / S3-compatible storage client.
 *
 * Uses the AWS SDK v3 S3 client pointed at MinIO.
 * Swap MINIO_ENDPOINT + credentials in .env to migrate to AWS S3 or
 * Cloudflare R2 with zero code changes.
 *
 * ── Presigned URL strategy ────────────────────────────────────────────────────
 *
 * AWS Signature V4 signs: method + path + query + Host header.
 * Changing ANY of those after signing invalidates the HMAC → 403.
 *
 * We sign with the INTERNAL endpoint (http://minio:9000) so the signed
 * path is exactly what MinIO receives.  Then we do a post-sign origin swap:
 * replace only the scheme+host+port (never touching the path or query string).
 *
 * Caddy proxies /storage/* → minio:9000 and forwards Host: minio:9000 so
 * MinIO sees the same Host that was signed.
 *
 * Example:
 *   signed URL   http://minio:9000/realm-files/key?X-Amz-...
 *   rewritten    https://realm.sanctyr.cloud/storage/realm-files/key?X-Amz-...
 *   Caddy strips /storage prefix → minio:9000 receives /realm-files/key?X-Amz-...
 *   MinIO validates Host: minio:9000 (set by Caddy header_up) ✓
 *   MinIO validates path /realm-files/key ✓  → 200
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Config ────────────────────────────────────────────────────────────────────

const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
const port     = Number(process.env.MINIO_PORT ?? 9000);
const useSSL   = process.env.MINIO_USE_SSL === 'true';
const protocol = useSSL ? 'https' : 'http';

const internalEndpoint = `${protocol}://${endpoint}:${port}`;

// MINIO_PUBLIC_URL = https://realm.sanctyr.cloud/storage
// We split it into origin (https://realm.sanctyr.cloud) and
// path prefix (/storage) so we can rewrite correctly.
const rawPublicUrl = process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '') ?? null;
const publicOrigin = rawPublicUrl ? (() => {
  const u = new URL(rawPublicUrl);
  return `${u.protocol}//${u.host}`; // scheme + host only, no path
})() : null;
const publicPathPrefix = rawPublicUrl ? (() => {
  const u = new URL(rawPublicUrl);
  return u.pathname === '/' ? '' : u.pathname; // e.g. /storage
})() : '';

// ── S3 client (internal — for all SDK operations) ────────────────────────────

export const s3 = new S3Client({
  endpoint: internalEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId:     process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
});

export const BUCKET = process.env.MINIO_BUCKET ?? 'realm-files';

// ── URL rewriter ──────────────────────────────────────────────────────────────

/**
 * Swap the origin of an internally-signed presigned URL to the public origin,
 * then prepend the path prefix if MINIO_PUBLIC_URL includes one.
 *
 * ONLY the scheme+host+port are replaced.  The path and query string (which
 * contain the HMAC signature) are never touched, so the signature stays valid.
 *
 * Caddy must forward Host: minio:9000 to MinIO so MinIO sees the same Host
 * that was used when signing.  See the Caddyfile /storage/* block.
 */
function rewriteOrigin(presignedUrl: string): string {
  if (!publicOrigin) return presignedUrl;

  const u = new URL(presignedUrl);
  const originalOrigin = `${u.protocol}//${u.host}`;

  // Replace origin only — path + query string untouched
  let result = presignedUrl.replace(originalOrigin, publicOrigin);

  // Prepend path prefix (e.g. /storage) so Caddy can route it
  if (publicPathPrefix) {
    // Insert prefix after the origin, before the path
    result = result.replace(
      publicOrigin,
      publicOrigin + publicPathPrefix,
    );
  }

  return result;
}

// ── Presigned upload URL ──────────────────────────────────────────────────────

export interface PresignedUploadResult {
  uploadUrl: string;
  storageKey: string;
}

export async function createPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  expiresIn = 300,
): Promise<PresignedUploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });

  const signed   = await getSignedUrl(s3, command, { expiresIn });
  const uploadUrl = rewriteOrigin(signed);
  return { uploadUrl, storageKey };
}

// ── Presigned download URL ────────────────────────────────────────────────────

export async function createPresignedDownloadUrl(
  storageKey: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  const signed  = await getSignedUrl(s3, command, { expiresIn });
  return rewriteOrigin(signed);
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
  filename: string,
): string {
  const safe = filename.replace(/[/\\?%*:|"<>]/g, '_');
  return `workspaces/${workspaceId}/files/${fileId}/${safe}`;
}
