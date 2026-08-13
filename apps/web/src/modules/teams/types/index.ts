export interface TeamUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  user?: TeamUser;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  createdAt: string;
  updatedAt: string;
  leader?: TeamUser | null;
  members?: TeamMember[];
  _count?: { members: number; projects: number };
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
  leaderId?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string | null;
  leaderId?: string | null;
}
