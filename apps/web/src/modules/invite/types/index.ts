export interface AcceptInviteResponse {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: string;
}
