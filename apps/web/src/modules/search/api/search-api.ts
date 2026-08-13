/**
 * Search API client.
 * Global workspace search across tasks, projects, and wiki pages.
 */

import type { SearchResults } from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/search`;

export async function search(
  token: string,
  workspaceId: string,
  query: string
): Promise<SearchResults> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`${BASE(workspaceId)}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Search failed');
  return data as SearchResults;
}
