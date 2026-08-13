/** Full user profile returned by GET /api/v1/users/me */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceMembers: Array<{
    role: string;
    workspace: { id: string; name: string; slug: string };
  }>;
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
