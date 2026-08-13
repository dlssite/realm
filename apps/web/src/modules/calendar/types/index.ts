// ── Calendar module — UI types ────────────────────────────────────────────────

export type CalendarEventType = 'EVENT' | 'TASK' | 'MILESTONE';
export type RsvpStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';
export type CalendarView = 'month' | 'week' | 'day';

export interface EventAttendee {
  rsvp: RsvpStatus;
  user: { id: string; name: string; avatarUrl?: string | null };
}

export interface CalendarEvent {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string | null;
  type: CalendarEventType;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  color: string;
  projectId: string | null;
  teamId: string | null;
  createdById: string;
  createdBy: { id: string; name: string; avatarUrl?: string | null };
  project: { id: string; name: string; identifier: string } | null;
  team: { id: string; name: string } | null;
  attendees: EventAttendee[];
}

export interface CalendarTaskEntry {
  id: string;
  identifier: string;
  title: string;
  dueDate: string;
  status: string;
  priority: string;
  projectId: string | null;
  project: { id: string; name: string; identifier: string } | null;
  assignee: { id: string; name: string; avatarUrl?: string | null } | null;
}

export interface CalendarMilestoneEntry {
  id: string;
  name: string;
  dueDate: string;
  isCompleted: boolean;
  projectId: string;
  project: { id: string; name: string; identifier: string };
}

export interface CalendarFeed {
  events: CalendarEvent[];
  tasks: CalendarTaskEntry[];
  milestones: CalendarMilestoneEntry[];
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  isAllDay?: boolean;
  color?: string;
  projectId?: string;
  teamId?: string;
  attendeeIds?: string[];
}

export interface UpdateEventPayload {
  title?: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string;
  isAllDay?: boolean;
  color?: string;
}

/** Unified entry rendered on the grid — discriminated union */
export type CalendarEntry =
  | ({ kind: 'event' } & CalendarEvent)
  | ({ kind: 'task' } & CalendarTaskEntry)
  | ({ kind: 'milestone' } & CalendarMilestoneEntry);
