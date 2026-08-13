export type ProjectStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  workspaceId: string;
  identifier: string; // e.g. "PROJ-12"
  name: string;
  description?: string;
  status: ProjectStatus;
  teamId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
