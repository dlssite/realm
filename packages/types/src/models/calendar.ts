// ── Calendar module DTOs ──────────────────────────────────────────────────────

export type CalendarEventType = 'EVENT' | 'TASK' | 'MILESTONE';
export type RsvpStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';

export interface EventAttendeeDto {
  rsvp: RsvpStatus;
  user: { id: string; name: string; avatarUrl?: string | null };
}

export interface CalendarEventDto {
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
  attendees: EventAttendeeDto[];
}

// Surfaced task due-date entry in the feed
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

// Surfaced milestone entry in the feed
export interface CalendarMilestoneEntry {
  id: string;
  name: string;
  dueDate: string;
  isCompleted: boolean;
  projectId: string;
  project: { id: string; name: string; identifier: string };
}

export interface CalendarFeedResponse {
  events: CalendarEventDto[];
  tasks: CalendarTaskEntry[];
  milestones: CalendarMilestoneEntry[];
}

export interface CreateCalendarEventPayload {
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

export interface UpdateCalendarEventPayload {
  title?: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string;
  isAllDay?: boolean;
  color?: string;
}
