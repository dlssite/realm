export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface TaskUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: TaskUser;
}

export interface TaskDependency {
  blockingTaskId: string;
  blockedTaskId: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  identifier: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  milestoneId: string | null;
  parentId: string | null;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  assignee?: TaskUser | null;
  createdBy?: TaskUser;
  labels?: { label: Label }[];
  subtasks?: Partial<Task>[];
  comments?: TaskComment[];
  _count?: { subtasks: number; comments: number };
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  milestoneId?: string;
  parentId?: string;
  assigneeId?: string;
  dueDate?: string;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface CreateLabelPayload {
  name: string;
  color?: string;
}
