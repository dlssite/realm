export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_MENTIONED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT_ADDED'
  | 'TASK_DUE_SOON'
  | 'PROJECT_MEMBER_ADDED'
  | 'MILESTONE_COMPLETED'
  | 'WORKSPACE_INVITED'
  | 'MEMBER_ROLE_CHANGED'
  | 'TEAM_MEMBER_ADDED';

export interface NotificationItem {
  id:          string;
  createdAt:   string;
  type:        NotificationType;
  title:       string;
  body:        string | null;
  entityType:  string;
  entityId:    string;
  entityTitle: string | null;
  actorId:     string | null;
  actorName:   string | null;
  isRead:      boolean;
  readAt:      string | null;
  workspaceId: string | null;
}

export interface NotificationPage {
  items:       NotificationItem[];
  nextCursor:  string | null;
  hasNextPage: boolean;
}
