/** TanStack Query key factory for the Dashboard module. */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  navCounts: (workspaceId: string) =>
    [...dashboardKeys.all, workspaceId, 'nav-counts'] as const,
};
