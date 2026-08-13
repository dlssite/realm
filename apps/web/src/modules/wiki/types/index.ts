export type WikiVisibility = 'WORKSPACE' | 'TEAM' | 'PROJECT' | 'ROLE';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'GUEST';

export interface WikiPageVersion {
  id: string;
  pageId: string;
  title: string;
  content: unknown | null;
  versionNumber: number;
  createdById: string;
  createdAt: string;
}

export interface WikiPage {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  isPublished: boolean;
  visibility: WikiVisibility;
  teamId: string | null;
  projectId: string | null;
  visibilityRole: WorkspaceRole | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  versions?: WikiPageVersion[];
}

export interface WikiTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  content: unknown | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePagePayload {
  title: string;
  parentId?: string | null;
  content?: unknown;
  isPublished?: boolean;
  visibility?: WikiVisibility;
  teamId?: string;
  projectId?: string;
  visibilityRole?: WorkspaceRole;
}

export interface UpdatePagePayload {
  title?: string;
  parentId?: string | null;
  content?: unknown;
  isPublished?: boolean;
  visibility?: WikiVisibility;
  teamId?: string | null;
  projectId?: string | null;
  visibilityRole?: WorkspaceRole | null;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  content?: unknown;
}
