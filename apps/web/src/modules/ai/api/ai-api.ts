/**
 * AI API client (Emberlyn).
 * Covers workspace AI config, chat completions, summarization, and conversation history.
 */

import type {
  AiConfig,
  UpdateAiConfigPayload,
  AvailableModelsResponse,
  AiChatPayload,
  AiChatResponse,
  AiConversation,
  SummarizePayload,
  SummarizeResponse,
} from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/ai`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function fetchAiConfig(token: string, workspaceId: string): Promise<AiConfig> {
  const res = await fetch(`${BASE(workspaceId)}/config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch AI config');
  return data as AiConfig;
}

export async function updateAiConfig(
  token: string,
  workspaceId: string,
  payload: UpdateAiConfigPayload
): Promise<AiConfig> {
  const res = await fetch(`${BASE(workspaceId)}/config`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update AI config');
  return data as AiConfig;
}

export async function fetchAvailableModels(
  token: string,
  workspaceId: string
): Promise<AvailableModelsResponse> {
  const res = await fetch(`${BASE(workspaceId)}/available-models`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch available models');
  return data as AvailableModelsResponse;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function chat(
  token: string,
  workspaceId: string,
  payload: AiChatPayload
): Promise<AiChatResponse> {
  const res = await fetch(`${BASE(workspaceId)}/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'AI chat request failed');
  return data as AiChatResponse;
}

// ── Summarize ─────────────────────────────────────────────────────────────────

export async function summarize(
  token: string,
  workspaceId: string,
  payload: SummarizePayload
): Promise<SummarizeResponse> {
  const res = await fetch(`${BASE(workspaceId)}/summarize`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Summarization failed');
  return data as SummarizeResponse;
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function listConversations(
  token: string,
  workspaceId: string
): Promise<AiConversation[]> {
  const res = await fetch(`${BASE(workspaceId)}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load conversations');
  return data as AiConversation[];
}

export async function deleteConversation(
  token: string,
  workspaceId: string,
  conversationId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete conversation');
  }
}
