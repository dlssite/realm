/** TanStack Query key factory for the Tasks module. */
export const tasksKeys = {
  all: ['tasks'] as const,
  labels: (workspaceId: string) =>
    ['labels', workspaceId] as const,
  list: (workspaceId: string, params?: Record<string, string | undefined>) =>
    [...tasksKeys.all, workspaceId, 'list', params ?? {}] as const,
  detail: (workspaceId: string, taskId: string) =>
    [...tasksKeys.all, workspaceId, 'detail', taskId] as const,
};
