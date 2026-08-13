export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  workspaceName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export interface AuthResponse {
  user: AuthUser;
  workspace: AuthWorkspace | null;
  token: string;
}

export interface MeResponse {
  user: AuthUser;
  workspace: AuthWorkspace | null;
}
