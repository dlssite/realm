/**
 * Invite API client.
 * Handles accepting a workspace invitation via a token link.
 */

import type { AcceptInviteResponse } from '../types';

const BASE = 'http://localhost:4000/api/v1';

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** Accept a workspace invitation using the invite token from the URL */
export async function acceptInvitation(
  token: string,
  inviteToken: string
): Promise<AcceptInviteResponse> {
  const res = await fetch(`${BASE}/invitations/${inviteToken}/accept`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to accept invitation');
  return data as AcceptInviteResponse;
}

/** Fetch invitation details by token (for the pre-accept preview screen) */
export async function fetchInvitation(inviteToken: string): Promise<{
  email: string;
  workspaceName: string;
  role: string;
  expiresAt: string;
}> {
  const res = await fetch(`${BASE}/invitations/${inviteToken}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Invalid or expired invitation');
  return data;
}
