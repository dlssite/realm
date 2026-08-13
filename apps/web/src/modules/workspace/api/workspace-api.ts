import { API_BASE } from '@/lib/api';
/**
 * Workspace API client.
 * Covers workspace CRUD, members, invitations, and nav badge counts.
 */

import type {
  Workspace,
  WorkspaceMember,
  CreateWorkspacePayload,
  Invitation,
  CreateInvitationPayload,
  UpdateMemberRolePayload,
  NavCounts,
} from '../types';

const BASE = `${API_BASE}/api/v1/workspaces`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export async function listWorkspaces(token: string): Promise<Workspace[]> {
  const res = await fetch(BASE, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load workspaces');
  return data as Workspace[];
}

export async function createWorkspace(
  token: string,
  payload: CreateWorkspacePayload
): Promise<Workspace> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create workspace');
  return data as Workspace;
}

export async function fetchNavCounts(
  token: string,
  workspaceId: string
): Promise<NavCounts> {
  const res = await fetch(`${BASE}/${workspaceId}/nav-counts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch nav counts');
  return data as NavCounts;
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function listMembers(
  token: string,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const res = await fetch(`${BASE}/${workspaceId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load members');
  return data as WorkspaceMember[];
}

export async function updateMemberRole(
  token: string,
  workspaceId: string,
  userId: string,
  payload: UpdateMemberRolePayload
): Promise<WorkspaceMember> {
  const res = await fetch(`${BASE}/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update member role');
  return data as WorkspaceMember;
}

export async function removeMember(
  token: string,
  workspaceId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`${BASE}/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to remove member');
  }
}

// ── Invitations ───────────────────────────────────────────────────────────────

export async function listInvitations(
  token: string,
  workspaceId: string
): Promise<Invitation[]> {
  const res = await fetch(`${BASE}/${workspaceId}/invitations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load invitations');
  return data as Invitation[];
}

export async function createInvitation(
  token: string,
  workspaceId: string,
  payload: CreateInvitationPayload
): Promise<Invitation> {
  const res = await fetch(`${BASE}/${workspaceId}/invitations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create invitation');
  return data as Invitation;
}

export async function revokeInvitation(
  token: string,
  workspaceId: string,
  invitationId: string
): Promise<void> {
  const res = await fetch(`${BASE}/${workspaceId}/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to revoke invitation');
  }
}
