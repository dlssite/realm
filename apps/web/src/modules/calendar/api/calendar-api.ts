import { API_BASE } from '@/lib/api';
import type {
  CalendarFeed,
  CalendarEvent,
  CreateEventPayload,
  UpdateEventPayload,
} from '../types';

const BASE = (workspaceId: string) =>
  `${API_BASE}/api/v1/workspaces/${workspaceId}/calendar`;

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** Unified feed: events + task due dates + milestones for a date range */
export async function fetchFeed(
  token: string,
  workspaceId: string,
  from: Date,
  to: Date
): Promise<CalendarFeed> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const res = await fetch(`${BASE(workspaceId)}/feed?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load calendar');
  return data as CalendarFeed;
}

/** Create a new calendar event */
export async function createEvent(
  token: string,
  workspaceId: string,
  payload: CreateEventPayload
): Promise<CalendarEvent> {
  const res = await fetch(`${BASE(workspaceId)}/events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to create event');
  return data as CalendarEvent;
}

/** Update an existing event */
export async function updateEvent(
  token: string,
  workspaceId: string,
  eventId: string,
  payload: UpdateEventPayload
): Promise<CalendarEvent> {
  const res = await fetch(`${BASE(workspaceId)}/events/${eventId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update event');
  return data as CalendarEvent;
}

/** Delete an event */
export async function deleteEvent(
  token: string,
  workspaceId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to delete event');
  }
}

/** Update RSVP for the current user */
export async function updateRsvp(
  token: string,
  workspaceId: string,
  eventId: string,
  rsvp: 'ACCEPTED' | 'DECLINED' | 'MAYBE'
): Promise<void> {
  const res = await fetch(`${BASE(workspaceId)}/events/${eventId}/rsvp`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ rsvp }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message ?? 'Failed to update RSVP');
  }
}
