export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface Task {
  id: string;
  workspaceId: string;
  projectId?: string;
  identifier: string; // e.g. "TASK-101"
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
