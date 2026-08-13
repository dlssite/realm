/**
 * Projects API client.
 * Covers projects, milestones, and goals under a workspace.
 */

import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  Milestone,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  Goal,
  CreateGoalPayload,
  UpdateGoalPayload,
  ProjectAssignee,
} from '../types';

const BASE = (workspaceId: string) =>
  `http://localhost:4000/api/v1/workspaces/${workspaceId}/projects`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(token: string, workspaceId: string): Promise<Project[]> {
  const res = await fetch(BASE(workspaceId), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load projects');
  return data as Project[];
}

export async function createProject(
  token: string,
  workspaceId: string,
  payload: CreateProjectPayload
): Promise<Project> {
  const res = await fetch(BASE(workspaceId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create project');
  return data as Project;
}

export async function fetchProject(
  token: string,
  workspaceId: string,
  projectId: string
): Promise<Project> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch project');
  return data as Project;
}

export async function updateProject(
  token: string,
  workspaceId: string,
  projectId: string,
  payload: UpdateProjectPayload
): Promise<Project> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update project');
  return data as Project;
}

export async function deleteProject(
  token: string,
  workspaceId: string,
  projectId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete project');
  }
}

export async function fetchProjectAssignees(
  token: string,
  workspaceId: string,
  projectId: string
): Promise<ProjectAssignee[]> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/assignees`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch assignees');
  return data as ProjectAssignee[];
}

// ── Milestones ────────────────────────────────────────────────────────────────

export async function createMilestone(
  token: string,
  workspaceId: string,
  projectId: string,
  payload: CreateMilestonePayload
): Promise<Milestone> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/milestones`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create milestone');
  return data as Milestone;
}

export async function updateMilestone(
  token: string,
  workspaceId: string,
  projectId: string,
  milestoneId: string,
  payload: UpdateMilestonePayload
): Promise<Milestone> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update milestone');
  return data as Milestone;
}

export async function deleteMilestone(
  token: string,
  workspaceId: string,
  projectId: string,
  milestoneId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/milestones/${milestoneId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete milestone');
  }
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function createGoal(
  token: string,
  workspaceId: string,
  projectId: string,
  payload: CreateGoalPayload
): Promise<Goal> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/goals`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create goal');
  return data as Goal;
}

export async function updateGoal(
  token: string,
  workspaceId: string,
  projectId: string,
  goalId: string,
  payload: UpdateGoalPayload
): Promise<Goal> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/goals/${goalId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update goal');
  return data as Goal;
}

export async function deleteGoal(
  token: string,
  workspaceId: string,
  projectId: string,
  goalId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/${projectId}/goals/${goalId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete goal');
  }
}
