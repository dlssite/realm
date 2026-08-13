export type AutomationTrigger =
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_DUE_DATE_REACHED'
  | 'PROJECT_STATUS_CHANGED'
  | 'MEMBER_JOINED';

export type AutomationAction =
  | 'ASSIGN_TASK'
  | 'CHANGE_TASK_STATUS'
  | 'SEND_NOTIFICATION'
  | 'ADD_LABEL';

export interface AutomationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains';
  value: string;
}

export interface Automation {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  action: AutomationAction;
  actionPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationPayload {
  name: string;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  action: AutomationAction;
  actionPayload: Record<string, unknown>;
  isActive?: boolean;
}

export type UpdateAutomationPayload = Partial<CreateAutomationPayload>;
