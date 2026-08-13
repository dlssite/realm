/**
 * Teams API client.
 * Teams live under a workspace; endpoints are on the workspace router.
 */

import type {
  Team,
  TeamMember,
  CreateTeamPayload,
  UpdateTeamPayload,
} from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/teams`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function listTeams(token: string, workspaceId: string): Promise<Team[]> {
  const res = await fetch(BASE(workspaceId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load teams');
  return data as Team[];
}

export async function createTeam(
  token: string,
  workspaceId: string,
  payload: CreateTeamPayload
): Promise<Team> {
  const res = await fetch(BASE(workspaceId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create team');
  return data as Team;
}

export async function updateTeam(
  token: string,
  workspaceId: string,
  teamId: string,
  payload: UpdateTeamPayload
): Promise<Team> {
  const res = await fetch(`${BASE(workspaceId)}/${teamId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update team');
  return data as Team;
}

export async function deleteTeam(
  token: string,
  workspaceId: string,
  teamId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${teamId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete team');
  }
}

export async function addTeamMember(
  token: string,
  workspaceId: string,
  teamId: string,
  userId: string
): Promise<TeamMember> {
  const res = await fetch(`${BASE(workspaceId)}/${teamId}/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to add team member');
  return data as TeamMember;
}

export async function removeTeamMember(
  token: string,
  workspaceId: string,
  teamId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to remove team member');
  }
}
