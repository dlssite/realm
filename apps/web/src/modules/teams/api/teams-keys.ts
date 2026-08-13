/** TanStack Query key factory for the Teams module. */
export const teamsKeys = {
  all: ['teams'] as const,
  list: (workspaceId: string) =>
    [...teamsKeys.all, workspaceId, 'list'] as const,
  detail: (workspaceId: string, teamId: string) =>
    [...teamsKeys.all, workspaceId, 'detail', teamId] as const,
};
