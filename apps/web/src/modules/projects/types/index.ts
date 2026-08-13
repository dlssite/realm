export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface ProjectAssignee {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Milestone {
  id: string;
  projectId: string;
  createdById: string;
  name: string;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  projectId: string;
  createdById: string;
  name: string;
  targetValue: number;
  currentValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  identifier: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  teamId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy?: { id: string; name: string; avatarUrl: string | null };
  team?: { id: string; name: string; leaderId: string | null } | null;
  members?: { userId: string; role: string }[];
  milestones?: Milestone[];
  goals?: Goal[];
  _count?: { tasks: number; milestones: number };
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: ProjectStatus;
  teamId?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export interface CreateMilestonePayload {
  name: string;
  dueDate?: string;
}

export interface UpdateMilestonePayload {
  name?: string;
  dueDate?: string | null;
  isCompleted?: boolean;
}

export interface CreateGoalPayload {
  name: string;
  targetValue?: number;
  currentValue?: number;
}

export type UpdateGoalPayload = Partial<CreateGoalPayload>;
