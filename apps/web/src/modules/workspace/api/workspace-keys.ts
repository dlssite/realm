/** TanStack Query key factory for the Workspace module. */
export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  members: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, 'members'] as const,
  invitations: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, 'invitations'] as const,
  navCounts: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, 'nav-counts'] as const,
};
