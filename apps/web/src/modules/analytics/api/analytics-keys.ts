/** TanStack Query key factory for the Analytics module. */
export const analyticsKeys = {
  all: ['analytics'] as const,
  workspace: (workspaceId: string, params?: Record<string, string | undefined>) =>
    [...analyticsKeys.all, workspaceId, params ?? {}] as const,
};
