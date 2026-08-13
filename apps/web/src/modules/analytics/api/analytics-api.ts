/**
 * Analytics API client.
 * Fetches workspace-level metrics and reporting data.
 */

import type { WorkspaceAnalytics, AnalyticsParams } from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/analytics`;

export async function fetchAnalytics(
  token: string,
  workspaceId: string,
  params?: AnalyticsParams
): Promise<WorkspaceAnalytics> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.projectId) qs.set('projectId', params.projectId);

  const res = await fetch(`${BASE(workspaceId)}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load analytics');
  return data as WorkspaceAnalytics;
}
