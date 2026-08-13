/** TanStack Query key factory for the Search module. */
export const searchKeys = {
  all: ['search'] as const,
  results: (workspaceId: string, query: string) =>
    [...searchKeys.all, workspaceId, query] as const,
};
