export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'GUEST';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: WorkspaceRole;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceMemberUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  user?: WorkspaceMemberUser;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface NavCounts {
  projects: number;
  tasks: number;
  chat: number;
}

export interface CreateWorkspacePayload {
  name: string;
}

export interface CreateInvitationPayload {
  email: string;
  role?: Exclude<WorkspaceRole, 'OWNER'>;
}

export interface UpdateMemberRolePayload {
  role: Exclude<WorkspaceRole, 'OWNER'>;
}
