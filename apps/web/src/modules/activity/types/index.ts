export type AuditEntityType =
  | 'TASK'
  | 'PROJECT'
  | 'MILESTONE'
  | 'WIKI_PAGE'
  | 'COMMENT'
  | 'CHANNEL'
  | 'FILE'
  | 'WORKSPACE'
  | 'TEAM'
  | 'MEMBER';

export type AuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'COMMENTED'
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'MOVED'
  | 'RESTORED'
  | 'UPLOADED'
  | 'MENTIONED';

export interface ActivityActor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ActivityEvent {
  id: string;
  createdAt: string;
  entityType: AuditEntityType;
  entityId: string;
  entityTitle: string | null;
  action: AuditAction;
  meta: Record<string, unknown> | null;
  actor: ActivityActor;
}

export interface ActivityPage {
  items: ActivityEvent[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface ListActivityParams {
  entityType?: AuditEntityType | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  action?: AuditAction | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}
