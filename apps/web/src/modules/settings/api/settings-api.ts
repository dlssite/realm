import { API_BASE } from '@/lib/api';
/**
 * Settings API client.
 * Workspace-level settings are managed via the workspace and AI config endpoints.
 * User-level settings (profile, password) live in the profile module.
 * This client provides a unified entry point for settings page data needs.
 */

import type { WorkspaceSettings, UpdateWorkspaceSettingsPayload } from '../types';

const BASE = (workspaceId: string) =>
  `${API_BASE}/api/v1/workspaces/${workspaceId}`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** Fetch workspace settings (name, slug, member list) */
export async function fetchWorkspaceSettings(
  token: string,
  workspaceId: string
): Promise<WorkspaceSettings> {
  const [membersRes, invitesRes] = await Promise.all([
    fetch(`${BASE(workspaceId)}/members`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${BASE(workspaceId)}/invitations`, { headers: { Authorization: `Bearer ${token}` } }),
  ]);

  const members = membersRes.ok ? await membersRes.json() : [];
  const invitations = invitesRes.ok ? await invitesRes.json() : [];

  return { members, invitations } as WorkspaceSettings;
}

/** Update workspace display name */
export async function updateWorkspace(
  token: string,
  workspaceId: string,
  payload: UpdateWorkspaceSettingsPayload
): Promise<{ id: string; name: string; slug: string }> {
  const res = await fetch(`${API_BASE}/api/v1/workspaces`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update workspace');
  return data;
}
