import { EmberlynTool } from '../tool-context';

// ─── get_calendar_feed ────────────────────────────────────────────────────────
const getCalendarFeed: EmberlynTool = {
  name: 'get_calendar_feed',
  description:
    'Get the unified calendar feed for a date range. Returns custom events (with attendee RSVP statuses), task due dates, and project milestones merged together. ' +
    'Use this when the user asks "what\'s on the calendar", "what\'s due this week", "show me upcoming deadlines", or "what events are coming up". ' +
    'IMPORTANT: For a single day (e.g. "today" or "what\'s on August 13"), pass startDate as the start of that day ' +
    '(e.g. "2026-08-13T00:00:00.000Z") and endDate as the END of that day (e.g. "2026-08-13T23:59:59.999Z"). ' +
    'Never pass the same instant for both startDate and endDate or the range will be empty.',
  parameters: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Range start as ISO 8601 date string (e.g. 2026-08-01)' },
      endDate: { type: 'string', description: 'Range end as ISO 8601 date string (e.g. 2026-08-31)' },
      projectId: { type: 'string', description: 'Scope to a specific project UUID (optional)' },
    },
    required: ['startDate', 'endDate'],
  },
  async execute(args, ctx) {
    const { startDate, endDate, projectId } = args as {
      startDate: string;
      endDate: string;
      projectId?: string;
    };

    const start = new Date(startDate);

    // If endDate is a bare date (no time component) or equals startDate's date,
    // expand it to end-of-day so the range covers the full day.
    let end = new Date(endDate);
    const endIsBareDate = /^\d{4}-\d{2}-\d{2}$/.test(endDate.trim());
    const endSameDayAsStart =
      start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10) &&
      end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0;
    if (endIsBareDate || endSameDayAsStart) {
      end = new Date(end);
      end.setHours(23, 59, 59, 999);
    }

    // Fetch custom events with full attendee RSVP data
    // Overlap condition: event starts before range ends AND event ends after range starts.
    // This correctly catches events that span across the range boundary (e.g. multi-day,
    // or an event created yesterday that ends today).
    const events = await ctx.prisma.calendarEvent.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        startsAt: { lt: end },
        endsAt:   { gt: start },
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        startsAt: true,
        endsAt: true,
        isAllDay: true,
        color: true,
        createdById: true,
        project: { select: { id: true, name: true } },
        attendees: {
          select: {
            rsvp: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Fetch tasks with due dates in range
    const tasks = await ctx.prisma.task.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        dueDate: { gte: start, lte: end },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        identifier: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Fetch milestones in range
    const milestones = await ctx.prisma.milestone.findMany({
      where: {
        project: { workspaceId: ctx.workspaceId },
        ...(projectId ? { projectId } : {}),
        dueDate: { gte: start, lte: end },
        isCompleted: false,
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        name: true,
        dueDate: true,
        isCompleted: true,
        project: { select: { id: true, name: true } },
      },
    });

    // Enrich each event with a human-readable attendee summary
    const enrichedEvents = events.map((e) => {
      const myRsvp = e.attendees.find((a) => a.user.id === ctx.userId)?.rsvp ?? null;
      const accepted = e.attendees.filter((a) => a.rsvp === 'ACCEPTED').length;
      const pending  = e.attendees.filter((a) => a.rsvp === 'PENDING').length;
      const declined = e.attendees.filter((a) => a.rsvp === 'DECLINED').length;
      return {
        ...e,
        _type: 'EVENT',
        isOrganiser: e.createdById === ctx.userId,
        myRsvp,
        attendeeSummary: { total: e.attendees.length, accepted, pending, declined },
      };
    });

    return {
      range: { start: startDate, end: endDate },
      events: enrichedEvents,
      tasksDue: tasks.map((t) => ({ ...t, _type: 'TASK' })),
      milestones: milestones.map((m) => ({ ...m, _type: 'MILESTONE' })),
      totals: { events: events.length, tasksDue: tasks.length, milestones: milestones.length },
    };
  },
};

// ─── get_my_event_invites ─────────────────────────────────────────────────────
const getMyEventInvites: EmberlynTool = {
  name: 'get_my_event_invites',
  description:
    'Get calendar events the current user has been invited to. ' +
    'Optionally filter by RSVP status. ' +
    'Use this when the user asks "what events am I invited to?", "do I have any pending event invites?", ' +
    '"which events have I declined?", or "show me events I haven\'t responded to yet".',
  parameters: {
    type: 'object',
    properties: {
      rsvpFilter: {
        type: 'string',
        enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE', 'ALL'],
        description:
          'Filter by RSVP status. Use PENDING to find events that still need a response. Defaults to ALL.',
      },
      includeOrganised: {
        type: 'boolean',
        description:
          'Include events the user organised themselves (they are always ACCEPTED as organiser). Defaults to false.',
      },
    },
    required: [],
  },
  async execute(args, ctx) {
    const { rsvpFilter = 'ALL', includeOrganised = false } = args as {
      rsvpFilter?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE' | 'ALL';
      includeOrganised?: boolean;
    };

    const attendeeRecords = await ctx.prisma.eventAttendee.findMany({
      where: {
        userId: ctx.userId,
        ...(rsvpFilter !== 'ALL' ? { rsvp: rsvpFilter } : {}),
        event: {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          // Exclude events organised by the user unless explicitly requested
          ...(!includeOrganised ? { createdById: { not: ctx.userId } } : {}),
        },
      },
      orderBy: { event: { startsAt: 'asc' } },
      select: {
        rsvp: true,
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startsAt: true,
            endsAt: true,
            isAllDay: true,
            color: true,
            createdById: true,
            createdBy: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
            attendees: {
              select: {
                rsvp: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const invites = attendeeRecords.map(({ rsvp, event }) => ({
      eventId: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      isAllDay: event.isAllDay,
      myRsvp: rsvp,
      organiser: event.createdBy,
      project: event.project,
      attendeeSummary: {
        total: event.attendees.length,
        accepted: event.attendees.filter((a) => a.rsvp === 'ACCEPTED').length,
        pending:  event.attendees.filter((a) => a.rsvp === 'PENDING').length,
        declined: event.attendees.filter((a) => a.rsvp === 'DECLINED').length,
      },
    }));

    return {
      filter: rsvpFilter,
      count: invites.length,
      invites,
    };
  },
};

// ─── create_event ─────────────────────────────────────────────────────────────
const createEvent: EmberlynTool = {
  name: 'create_event',
  description:
    'Create a new calendar event. The creator is automatically added as an accepted attendee. ' +
    'You can invite other workspace members by passing their user IDs in attendeeIds — they will receive PENDING invites and can RSVP from the calendar.',
  parameters: {
    type: 'object',
    properties: {
      title:        { type: 'string',  description: 'Event title (required)' },
      startsAt:     { type: 'string',  description: 'Start datetime as ISO 8601 string (required)' },
      endsAt:       { type: 'string',  description: 'End datetime as ISO 8601 string (required)' },
      description:  { type: 'string',  description: 'Event description' },
      isAllDay:     { type: 'boolean', description: 'Whether this is an all-day event (default false)' },
      color:        { type: 'string',  description: 'Hex color for the event chip (default #7c3aed)' },
      projectId:    { type: 'string',  description: 'UUID of the project to scope this event to' },
      teamId:       { type: 'string',  description: 'UUID of the team to scope this event to' },
      attendeeIds:  {
        type: 'array',
        items: { type: 'string' },
        description:
          'Array of workspace member user UUIDs to invite. They will be added with PENDING status. ' +
          'The creator is always included automatically — do not add the creator\'s own ID here.',
      },
    },
    required: ['title', 'startsAt', 'endsAt'],
  },
  async execute(args, ctx) {
    const {
      title, startsAt, endsAt, description, isAllDay,
      color, projectId, teamId, attendeeIds = [],
    } = args as {
      title: string;
      startsAt: string;
      endsAt: string;
      description?: string;
      isAllDay?: boolean;
      color?: string;
      projectId?: string;
      teamId?: string;
      attendeeIds?: string[];
    };

    // Deduplicate and exclude the creator (they're added as ACCEPTED automatically)
    const inviteeIds = [...new Set(attendeeIds)].filter((id) => id !== ctx.userId);

    const event = await ctx.prisma.calendarEvent.create({
      data: {
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
        title,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        description: description ?? null,
        isAllDay: isAllDay ?? false,
        color: color ?? '#7c3aed',
        projectId: projectId ?? null,
        teamId: teamId ?? null,
        type: 'EVENT',
        attendees: {
          create: [
            // Creator is always ACCEPTED
            { userId: ctx.userId, rsvp: 'ACCEPTED' },
            // Invitees are PENDING
            ...inviteeIds.map((userId) => ({ userId, rsvp: 'PENDING' as const })),
          ],
        },
      },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        isAllDay: true,
        color: true,
        attendees: {
          select: {
            rsvp: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      success: true,
      event,
      invitedCount: inviteeIds.length,
    };
  },
};

// ─── update_event ─────────────────────────────────────────────────────────────
const updateEvent: EmberlynTool = {
  name: 'update_event',
  description: 'Update the details of an existing calendar event (title, time, description, color). Does not change attendees — use rsvp_event for RSVP changes.',
  parameters: {
    type: 'object',
    properties: {
      eventId:     { type: 'string', description: 'Calendar event UUID' },
      title:       { type: 'string', description: 'New title' },
      startsAt:    { type: 'string', description: 'New start datetime ISO 8601' },
      endsAt:      { type: 'string', description: 'New end datetime ISO 8601' },
      description: { type: 'string', description: 'New description' },
      color:       { type: 'string', description: 'New hex color' },
    },
    required: ['eventId'],
  },
  async execute(args, ctx) {
    const { eventId, title, startsAt, endsAt, description, color } = args as {
      eventId: string;
      title?: string;
      startsAt?: string;
      endsAt?: string;
      description?: string;
      color?: string;
    };

    const existing = await ctx.prisma.calendarEvent.findFirst({
      where: { id: eventId, workspaceId: ctx.workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return { error: 'Event not found.' };

    const updateData: Record<string, unknown> = {};
    if (title       !== undefined) updateData.title       = title;
    if (startsAt    !== undefined) updateData.startsAt    = new Date(startsAt);
    if (endsAt      !== undefined) updateData.endsAt      = new Date(endsAt);
    if (description !== undefined) updateData.description = description;
    if (color       !== undefined) updateData.color       = color;

    const event = await ctx.prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      select: { id: true, title: true, startsAt: true, endsAt: true },
    });

    return { success: true, event };
  },
};

// ─── delete_event ─────────────────────────────────────────────────────────────
const deleteEvent: EmberlynTool = {
  name: 'delete_event',
  description:
    'Soft-delete a calendar event. Only manually created EVENT entries can be deleted — TASK and MILESTONE entries are read-only and managed through their own modules.',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Calendar event UUID' },
    },
    required: ['eventId'],
  },
  async execute(args, ctx) {
    const { eventId } = args as { eventId: string };

    const event = await ctx.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: { type: true, workspaceId: true, createdById: true },
    });

    if (!event || event.workspaceId !== ctx.workspaceId) {
      return { error: 'Event not found.' };
    }
    if (event.type !== 'EVENT') {
      return { error: 'Only manually created events can be deleted. Task and milestone entries are managed through their own modules.' };
    }

    await ctx.prisma.calendarEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });

    return { success: true, deletedId: eventId };
  },
};

// ─── rsvp_event ───────────────────────────────────────────────────────────────
const rsvpEvent: EmberlynTool = {
  name: 'rsvp_event',
  description:
    'Accept, decline, or mark maybe for a calendar event invite on behalf of the current user. ' +
    'Use this when the user says things like: ' +
    '"accept the team standup invite", "decline the Friday meeting", "mark me as maybe for the design review", ' +
    '"I can\'t make it to the all-hands", or "respond to my pending event invites". ' +
    'Use get_my_event_invites first if you need to find the event ID from a name.',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'UUID of the calendar event to respond to' },
      status: {
        type: 'string',
        enum: ['ACCEPTED', 'DECLINED', 'MAYBE'],
        description:
          'RSVP response: ACCEPTED (attending), DECLINED (not attending), MAYBE (tentative). ' +
          'Do not use PENDING — that is the system default for new invites.',
      },
    },
    required: ['eventId', 'status'],
  },
  async execute(args, ctx) {
    const { eventId, status } = args as {
      eventId: string;
      status: 'ACCEPTED' | 'DECLINED' | 'MAYBE';
    };

    // Verify the event exists in this workspace
    const event = await ctx.prisma.calendarEvent.findFirst({
      where: { id: eventId, workspaceId: ctx.workspaceId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) return { error: 'Event not found.' };

    // Verify the user is actually an attendee of this event
    const existing = await ctx.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId: ctx.userId } },
      select: { rsvp: true },
    });
    if (!existing) {
      return {
        error: `You are not an attendee of "${event.title}". You can only RSVP to events you have been invited to.`,
      };
    }

    const attendee = await ctx.prisma.eventAttendee.update({
      where: { eventId_userId: { eventId, userId: ctx.userId } },
      data: { rsvp: status },
      select: {
        rsvp: true,
        user: { select: { id: true, name: true } },
      },
    });

    const statusLabel: Record<string, string> = {
      ACCEPTED: 'accepted',
      DECLINED: 'declined',
      MAYBE: 'marked as maybe',
    };

    return {
      success: true,
      message: `Successfully ${statusLabel[status] ?? status} the event "${event.title}".`,
      eventId: event.id,
      eventTitle: event.title,
      rsvp: attendee.rsvp,
      user: attendee.user,
    };
  },
};

export const calendarTools: EmberlynTool[] = [
  getCalendarFeed,
  getMyEventInvites,
  createEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
];
