/**
 * Automations API client.
 * Covers workspace automation rules (triggers + actions).
 */

import type {
  Automation,
  CreateAutomationPayload,
  UpdateAutomationPayload,
} from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/automations`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function listAutomations(
  token: string,
  workspaceId: string
): Promise<Automation[]> {
  const res = await fetch(BASE(workspaceId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load automations');
  return data as Automation[];
}

export async function createAutomation(
  token: string,
  workspaceId: string,
  payload: CreateAutomationPayload
): Promise<Automation> {
  const res = await fetch(BASE(workspaceId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create automation');
  return data as Automation;
}

export async function updateAutomation(
  token: string,
  workspaceId: string,
  automationId: string,
  payload: UpdateAutomationPayload
): Promise<Automation> {
  const res = await fetch(`${BASE(workspaceId)}/${automationId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update automation');
  return data as Automation;
}

export async function deleteAutomation(
  token: string,
  workspaceId: string,
  automationId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${automationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete automation');
  }
}
