import { API_BASE } from '@/lib/api';
/**
 * Dashboard API client.
 * Aggregates nav counts and any dashboard-specific summary data.
 */

import type { NavCounts } from '../types';

const BASE = (workspaceId: string) =>
  `${API_BASE}/api/v1/workspaces/${workspaceId}`;

export async function fetchNavCounts(
  token: string,
  workspaceId: string
): Promise<NavCounts> {
  const res = await fetch(`${BASE(workspaceId)}/nav-counts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch nav counts');
  return data as NavCounts;
}
