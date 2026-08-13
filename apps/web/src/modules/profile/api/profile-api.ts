import type { UserProfile, UpdateProfilePayload, ChangePasswordPayload } from '../types';

const BASE = 'http://localhost:4000/api/v1/users';

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
