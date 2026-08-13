import { API_BASE } from '@/lib/api';
import type { UserProfile, UpdateProfilePayload, ChangePasswordPayload } from '../types';

const BASE = `${API_BASE}/api/v1/users`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/**
 * Fetch the authenticated user's full profile.
 */
export async function fetchProfile(token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/me`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json() as Promise<UserProfile>;
}

/**
 * Update display name and/or avatar URL.
 */
export async function updateProfile(
  token: string,
  payload: UpdateProfilePayload
): Promise<UserProfile> {
  const res = await fetch(`${BASE}/me`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update profile');
  return data as UserProfile;
}

/**
 * Step 1 — Request a presigned PUT URL for the avatar file.
 */
export async function getAvatarUploadUrl(
  token: string,
  contentType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; storageKey: string }> {
  const res = await fetch(`${BASE}/me/avatar/upload-url`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ contentType, fileSize }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to get upload URL');
  return data as { uploadUrl: string; storageKey: string };
}

/**
 * Step 2 — PUT the file bytes directly to MinIO using the presigned URL.
 */
export async function uploadAvatarToStorage(
  uploadUrl: string,
  file: File
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('Failed to upload avatar to storage');
}

/**
 * Step 3 — Confirm the upload. The API verifies the object exists, generates
 * a long-lived download URL, and persists it as the user's avatarUrl.
 */
export async function confirmAvatarUpload(
  token: string,
  storageKey: string,
): Promise<UserProfile> {
  const res = await fetch(`${BASE}/me/avatar/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ storageKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to confirm avatar upload');
  return data as UserProfile;
}

/**
 * Remove the user's avatar (clears the URL and deletes the stored object).
 */
export async function deleteAvatar(token: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/me/avatar`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to remove avatar');
  return data as UserProfile;
}

/**
 * Change the authenticated user's password.
 */
export async function changePassword(
  token: string,
  payload: ChangePasswordPayload
): Promise<void> {
  const res = await fetch(`${BASE}/me/change-password`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to change password');
}
