/** TanStack Query key factory for the Settings module. */
export const settingsKeys = {
  all: ['settings'] as const,
  workspace: (workspaceId: string) =>
    [...settingsKeys.all, workspaceId, 'workspace'] as const,
};
