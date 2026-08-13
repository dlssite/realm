/**
 * Wiki API client.
 * Covers pages, page versions, and templates under a workspace.
 */

import type {
  WikiPage,
  WikiPageVersion,
  WikiTemplate,
  CreatePagePayload,
  UpdatePagePayload,
  CreateTemplatePayload,
} from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/wiki`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export async function listPages(token: string, workspaceId: string): Promise<WikiPage[]> {
  const res = await fetch(BASE(workspaceId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load wiki pages');
  return data as WikiPage[];
}

export async function createPage(
  token: string,
  workspaceId: string,
  payload: CreatePagePayload
): Promise<WikiPage> {
  const res = await fetch(BASE(workspaceId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create wiki page');
  return data as WikiPage;
}

export async function fetchPage(
  token: string,
  workspaceId: string,
  pageId: string
): Promise<WikiPage & { latest: WikiPageVersion | null }> {
  const res = await fetch(`${BASE(workspaceId)}/${pageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch wiki page');
  return data as WikiPage & { latest: WikiPageVersion | null };
}

export async function updatePage(
  token: string,
  workspaceId: string,
  pageId: string,
  payload: UpdatePagePayload
): Promise<{ updated: boolean }> {
  const res = await fetch(`${BASE(workspaceId)}/${pageId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update wiki page');
  return data as { updated: boolean };
}

export async function deletePage(
  token: string,
  workspaceId: string,
  pageId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${pageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete wiki page');
  }
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function listPageVersions(
  token: string,
  workspaceId: string,
  pageId: string
): Promise<WikiPageVersion[]> {
  const res = await fetch(`${BASE(workspaceId)}/${pageId}/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load page versions');
  return data as WikiPageVersion[];
}

export async function restoreVersion(
  token: string,
  workspaceId: string,
  pageId: string,
  versionId: string
): Promise<{ restoredVersion: string }> {
  const res = await fetch(`${BASE(workspaceId)}/${pageId}/versions/${versionId}/restore`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to restore version');
  return data as { restoredVersion: string };
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function listTemplates(
  token: string,
  workspaceId: string
): Promise<WikiTemplate[]> {
  const res = await fetch(`${BASE(workspaceId)}/templates`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load wiki templates');
  return data as WikiTemplate[];
}

export async function createTemplate(
  token: string,
  workspaceId: string,
  payload: CreateTemplatePayload
): Promise<WikiTemplate> {
  const res = await fetch(`${BASE(workspaceId)}/templates`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create wiki template');
  return data as WikiTemplate;
}
