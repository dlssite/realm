/** TanStack Query key factory for the Activity module. */
export const activityKeys = {
  all: ['activity'] as const,
  list: (workspaceId: string, params?: Record<string, string | undefined>) =>
    [...activityKeys.all, workspaceId, 'list', params ?? {}] as const,
};
