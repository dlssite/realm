import type { WorkspaceMember, Invitation } from '../../workspace/types';

export interface WorkspaceSettings {
  members: WorkspaceMember[];
  invitations: Invitation[];
}

export interface UpdateWorkspaceSettingsPayload {
  name: string;
}
