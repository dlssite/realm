import type { WorkspaceRole } from './workspace';
import type { TaskStatus, TaskPriority } from './task';
import type { ProjectStatus } from './project';

// ── Profile Card ──────────────────────────────────────────────────────────────
// Shape returned by GET /api/v1/workspaces/:workspaceId/members/:userId/card
// Used by the UserProfileCard component everywhere in the app.

export interface ProfileCardUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ProfileCardTeam {
  id: string;
  name: string;
  isLeader: boolean;
}

export interface ProfileCardProject {
  id: string;
  name: string;
  identifier: string;
  status: ProjectStatus;
  /** User's role inside the project: "LEAD" | "MEMBER" */
  role: string;
}

export interface ProfileCardTask {
  id: string;
  identifier: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string | null;
}

/**
 * Full payload returned by the /card endpoint.
 * The `sections` field is intentionally open-ended so future modules
 * can attach extra panels without touching this core type.
 */
export interface UserProfileCardData {
  user: ProfileCardUser;
  workspaceRole: WorkspaceRole;
  joinedAt: string;
  teams: ProfileCardTeam[];
  /** Top 2 projects sorted by ACTIVE → PLANNED → rest, then most recently updated */
  projects: ProfileCardProject[];
  /** Total number of projects the user is involved in (may be > projects.length) */
  totalProjects: number;
  /** Up to 5 active (non-done, non-cancelled) assigned tasks */
  assignedTasks: ProfileCardTask[];
  /** Total task count keyed by TaskStatus string */
  taskCounts: Partial<Record<TaskStatus, number>>;
  extras?: Record<string, unknown>;
}
