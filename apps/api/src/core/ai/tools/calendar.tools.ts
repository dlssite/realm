import { EmberlynTool } from '../tool-context';

// ─── get_calendar_feed ────────────────────────────────────────────────────────
const getCalendarFeed: EmberlynTool = {
  name: 'get_calendar_feed',
  description:
    'Get the unified calendar feed for a date range. Returns custom events, task due dates, and project milestones merged together. Use this when the user asks "what\'s on the calendar", "what\'s due this week", or "show me upcoming deadlines".',
  parameters: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Range start as ISO 8601 date string (e.g. 2026-08-01)' },
      endDate: { type: 'string', description: 'Range end as ISO 8601 date string (e.g. 2026-08-31)' },
      projectId: { type: 'string', description: 'Scope to a specific project UUID' },
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
    const end = new Date(endDate);

    // Fetch custom events
    const events = await ctx.prisma.calendarEvent.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        startsAt: { gte: start, lte: end },
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
        project: { select: { id: true, name: true } },
        attendees: {
          include: { user: { select: { id: true, name: true } } },
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

    return {
      range: { start: startDate, end: endDate },
      events: events.map((e) => ({ ...e, _type: 'EVENT' })),
      tasksDue: tasks.map((t) => ({ ...t, _type: 'TASK' })),
      milestones: milestones.map((m) => ({ ...m, _type: 'MILESTONE' })),
      totals: { events: events.length, tasksDue: tasks.length, milestones: milestones.length },
    };
  },
};

// ─── create_event ─────────────────────────────────────────────────────────────
const createEvent: EmberlynTool = {
  name: 'create_event',
  description: 'Create a new calendar event.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event title (required)' },
      startsAt: { type: 'string', description: 'Start datetime as ISO 8601 string (required)' },
      endsAt: { type: 'string', description: 'End datetime as ISO 8601 string (required)' },
      description: { type: 'string', description: 'Event description' },
      isAllDay: { type: 'boolean', description: 'Whether this is an all-day event (default false)' },
      color: { type: 'string', description: 'Hex color for the event chip (default #7c3aed)' },
      projectId: { type: 'string', description: 'UUID of the project to scope this event to' },
      teamId: { type: 'string', description: 'UUID of the team to scope this event to' },
    },
    required: ['title', 'startsAt', 'endsAt'],
  },
  async execute(args, ctx) {
    const { title, startsAt, endsAt, description, isAllDay, color, projectId, teamId } = args as {
      title: string;
      startsAt: string;
      endsAt: string;
      description?: string;
      isAllDay?: boolean;
      color?: string;
      projectId?: string;
      teamId?: string;
    };

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
      },
    });

    return { success: true, event };
  },
};

// ─── update_event ─────────────────────────────────────────────────────────────
const updateEvent: EmberlynTool = {
  name: 'update_event',
  description: 'Update an existing calendar event.',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Calendar event UUID' },
      title: { type: 'string', description: 'New title' },
      startsAt: { type: 'string', description: 'New start datetime ISO 8601' },
      endsAt: { type: 'string', description: 'New end datetime ISO 8601' },
      description: { type: 'string', description: 'New description' },
      color: { type: 'string', description: 'New hex color' },
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

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
    if (endsAt !== undefined) updateData.endsAt = new Date(endsAt);
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    const event = await ctx.prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    return { success: true, event };
  },
};

// ─── delete_event ─────────────────────────────────────────────────────────────
const deleteEvent: EmberlynTool = {
  name: 'delete_event',
  description: 'Delete a calendar event. Only custom EVENT type events can be deleted — TASK and MILESTONE entries are read-only.',
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
  description: 'RSVP the current user to a calendar event.',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Calendar event UUID' },
      status: {
        type: 'string',
        enum: ['ACCEPTED', 'DECLINED', 'MAYBE', 'PENDING'],
        description: 'RSVP response',
      },
    },
    required: ['eventId', 'status'],
  },
  async execute(args, ctx) {
    const { eventId, status } = args as { eventId: string; status: string };

    const attendee = await ctx.prisma.eventAttendee.upsert({
      where: { eventId_userId: { eventId, userId: ctx.userId } },
      create: { eventId, userId: ctx.userId, rsvp: status as never },
      update: { rsvp: status as never },
    });

    return { success: true, attendee };
  },
};

export const calendarTools: EmberlynTool[] = [
  getCalendarFeed,
  createEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
];
