/** TanStack Query key factory for the Projects module. */
export const projectsKeys = {
  all: ['projects'] as const,
  list: (workspaceId: string) =>
    [...projectsKeys.all, workspaceId, 'list'] as const,
  detail: (workspaceId: string, projectId: string) =>
    [...projectsKeys.all, workspaceId, 'detail', projectId] as const,
  assignees: (workspaceId: string, projectId: string) =>
    [...projectsKeys.all, workspaceId, projectId, 'assignees'] as const,
};
