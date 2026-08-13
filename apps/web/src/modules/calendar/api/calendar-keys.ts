/** Query key factory for the Calendar module. */
export const calendarKeys = {
  all: ['calendar'] as const,
  feed: (workspaceId: string, from: string, to: string) =>
    [...calendarKeys.all, workspaceId, 'feed', from, to] as const,
  events: (workspaceId: string) =>
    [...calendarKeys.all, workspaceId, 'events'] as const,
};
