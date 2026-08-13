/** TanStack Query key factory for the Wiki module. */
export const wikiKeys = {
  all: ['wiki'] as const,
  list: (workspaceId: string) =>
    [...wikiKeys.all, workspaceId, 'list'] as const,
  detail: (workspaceId: string, pageId: string) =>
    [...wikiKeys.all, workspaceId, 'detail', pageId] as const,
  versions: (workspaceId: string, pageId: string) =>
    [...wikiKeys.all, workspaceId, pageId, 'versions'] as const,
  templates: (workspaceId: string) =>
    [...wikiKeys.all, workspaceId, 'templates'] as const,
};
