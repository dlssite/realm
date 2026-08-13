/** Query key factory for the Files module. */
export const filesKeys = {
  all: ['files'] as const,
  list: (workspaceId: string, projectId?: string) =>
    [...filesKeys.all, workspaceId, 'list', projectId ?? 'all'] as const,
};
