import { API_BASE } from '@/lib/api';
/**
 * Tasks API client.
 * Covers tasks, comments, labels, and dependencies under a workspace.
 */

import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskComment,
  Label,
  CreateLabelPayload,
  TaskDependency,
} from '../types';

const BASE = (workspaceId: string) =>
  `${API_BASE}/api/v1/workspaces/${workspaceId}`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Labels ────────────────────────────────────────────────────────────────────

export async function listLabels(token: string, workspaceId: string): Promise<Label[]> {
  const res = await fetch(`${BASE(workspaceId)}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load labels');
  return data as Label[];
}

export async function createLabel(
  token: string,
  workspaceId: string,
  payload: CreateLabelPayload
): Promise<Label> {
  const res = await fetch(`${BASE(workspaceId)}/labels`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create label');
  return data as Label;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface ListTasksParams {
  projectId?: string;
  milestoneId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  labelId?: string;
}

export async function listTasks(
  token: string,
  workspaceId: string,
  params?: ListTasksParams
): Promise<Task[]> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  }
  const res = await fetch(`${BASE(workspaceId)}/tasks?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load tasks');
  return data as Task[];
}

export async function createTask(
  token: string,
  workspaceId: string,
  payload: CreateTaskPayload
): Promise<Task> {
  const res = await fetch(`${BASE(workspaceId)}/tasks`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create task');
  return data as Task;
}

export async function fetchTask(
  token: string,
  workspaceId: string,
  taskId: string
): Promise<Task> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch task');
  return data as Task;
}

export async function updateTask(
  token: string,
  workspaceId: string,
  taskId: string,
  payload: UpdateTaskPayload
): Promise<Task> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update task');
  return data as Task;
}

export async function deleteTask(
  token: string,
  workspaceId: string,
  taskId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete task');
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function createComment(
  token: string,
  workspaceId: string,
  taskId: string,
  body: string
): Promise<TaskComment> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to post comment');
  return data as TaskComment;
}

// ── Dependencies ──────────────────────────────────────────────────────────────

export async function addDependency(
  token: string,
  workspaceId: string,
  taskId: string,
  blockingTaskId: string
): Promise<TaskDependency> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}/dependencies`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ blockingTaskId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to add dependency');
  return data as TaskDependency;
}

export async function removeDependency(
  token: string,
  workspaceId: string,
  taskId: string,
  blockingTaskId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}/dependencies/${blockingTaskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to remove dependency');
  }
}

// ── Task Labels ───────────────────────────────────────────────────────────────

export async function addTaskLabel(
  token: string,
  workspaceId: string,
  taskId: string,
  labelId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}/labels`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ labelId }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to add label to task');
  }
}

export async function removeTaskLabel(
  token: string,
  workspaceId: string,
  taskId: string,
  labelId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/tasks/${taskId}/labels/${labelId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to remove label from task');
  }
}
