import { API_BASE } from '@/lib/api';
/**
 * Activity API client.
 * Fetches the workspace audit log feed with cursor-based pagination.
 */

import type { ActivityPage, ListActivityParams } from '../types';

const BASE = (workspaceId: string) =>
  `${API_BASE}/api/v1/workspaces/${workspaceId}/activity`;

export async function listActivity(
  token: string,
  workspaceId: string,
  params?: ListActivityParams
): Promise<ActivityPage> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.entityId)   qs.set('entityId',   params.entityId);
  if (params?.actorId)    qs.set('actorId',     params.actorId);
  if (params?.action)     qs.set('action',      params.action);
  if (params?.limit)      qs.set('limit',       String(params.limit));
  if (params?.cursor)     qs.set('cursor',       params.cursor);

  const res = await fetch(`${BASE(workspaceId)}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load activity');
  return data as ActivityPage;
}
