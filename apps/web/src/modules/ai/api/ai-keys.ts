/** TanStack Query key factory for the AI module. */
export const aiKeys = {
  all: ['ai'] as const,
  config: (workspaceId: string) =>
    [...aiKeys.all, workspaceId, 'config'] as const,
  models: (workspaceId: string) =>
    [...aiKeys.all, workspaceId, 'models'] as const,
  conversations: (workspaceId: string) =>
    [...aiKeys.all, workspaceId, 'conversations'] as const,
};
