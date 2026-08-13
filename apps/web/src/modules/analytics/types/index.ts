export interface TaskStatusBreakdown {
  status: string;
  count: number;
}

export interface TaskPriorityBreakdown {
  priority: string;
  count: number;
}

export interface WorkspaceAnalytics {
  totalTasks: number;
  completedTasks: number;
  overdueTask: number;
  totalProjects: number;
  activeProjects: number;
  tasksByStatus: TaskStatusBreakdown[];
  tasksByPriority: TaskPriorityBreakdown[];
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
  projectId?: string;
}
