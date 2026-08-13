/**
 * Chat API client.
 * Covers channels, messages, reactions, and pinning.
 * Real-time messaging goes through the WebSocket; these are the REST counterparts.
 */

import type {
  Channel,
  ChatMessage,
  CreateChannelPayload,
  SendMessagePayload,
} from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Channels ──────────────────────────────────────────────────────────────────

export async function listChannels(token: string, workspaceId: string): Promise<Channel[]> {
  const res = await fetch(`${BASE(workspaceId)}/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load channels');
  return data as Channel[];
}

export async function createChannel(
  token: string,
  workspaceId: string,
  payload: CreateChannelPayload
): Promise<Channel> {
  const res = await fetch(`${BASE(workspaceId)}/channels`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create channel');
  return data as Channel;
}

/** Provision (or return existing) the team channel for a team */
export async function provisionTeamChannel(
  token: string,
  workspaceId: string,
  teamId: string
): Promise<Channel> {
  const res = await fetch(`${BASE(workspaceId)}/teams/${teamId}/channel`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to provision team channel');
  return data as Channel;
}

/** Provision (or return existing) the project channel for a project */
export async function provisionProjectChannel(
  token: string,
  workspaceId: string,
  projectId: string
): Promise<Channel> {
  const res = await fetch(`${BASE(workspaceId)}/projects/${projectId}/channel`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to provision project channel');
  return data as Channel;
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function listMessages(
  token: string,
  workspaceId: string,
  channelId: string
): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE(workspaceId)}/channels/${channelId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load messages');
  return data as ChatMessage[];
}

export async function sendMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  payload: SendMessagePayload
): Promise<ChatMessage> {
  const res = await fetch(`${BASE(workspaceId)}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to send message');
  return data as ChatMessage;
}

export async function deleteMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete message');
  }
}

/** Toggle pin on a message */
export async function togglePin(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string
): Promise<{ id: string; isPinned: boolean }> {
  const res = await fetch(
    `${BASE(workspaceId)}/channels/${channelId}/messages/${messageId}/pin`,
    { method: 'POST', headers: authHeaders(token) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to toggle pin');
  return data as { id: string; isPinned: boolean };
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export async function toggleReaction(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string,
  emoji: string
): Promise<{ id: string; emoji: string; userId: string; userName: string }[]> {
  const res = await fetch(
    `${BASE(workspaceId)}/channels/${channelId}/messages/${messageId}/reactions`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ emoji }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to toggle reaction');
  return data;
}
