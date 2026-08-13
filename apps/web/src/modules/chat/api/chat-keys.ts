/** TanStack Query key factory for the Chat module. */
export const chatKeys = {
  all: ['chat'] as const,
  channels: (workspaceId: string) =>
    [...chatKeys.all, workspaceId, 'channels'] as const,
  messages: (workspaceId: string, channelId: string) =>
    [...chatKeys.all, workspaceId, 'channels', channelId, 'messages'] as const,
};
