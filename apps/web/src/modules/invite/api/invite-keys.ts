/** TanStack Query key factory for the Invite module. */
export const inviteKeys = {
  all: ['invite'] as const,
  detail: (inviteToken: string) =>
    [...inviteKeys.all, 'detail', inviteToken] as const,
};
