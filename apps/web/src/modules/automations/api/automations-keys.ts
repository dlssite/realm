/** TanStack Query key factory for the Automations module. */
export const automationsKeys = {
  all: ['automations'] as const,
  list: (workspaceId: string) =>
    [...automationsKeys.all, workspaceId, 'list'] as const,
};
