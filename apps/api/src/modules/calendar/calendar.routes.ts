/**
 * Calendar routes — /api/v1/workspaces/:workspaceId/calendar
 *
 * Handles custom CalendarEvents (create, read, update, delete).
 * Also provides a unified feed endpoint that merges:
 *   - Custom events
 *   - Task due dates (surfaced read-only)
 *   - Project milestone dates (surfaced read-only)
 *
 * All routes require authentication and workspace membership.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';

// ── Validation schemas ────────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#7c3aed'),
  projectId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  attendeeIds: z.array(z.string().uuid()).default([]),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const feedQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  projectId: z.string().uuid().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

const eventSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  title: true,
  description: true,
  type: true,
  startsAt: true,
  endsAt: true,
  isAllDay: true,
  color: true,
  projectId: true,
  teamId: true,
  createdById: true,
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  project: { select: { id: true, name: true, identifier: true } },
  team: { select: { id: true, name: true } },
  attendees: {
    select: {
      rsvp: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
} as const;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function calendarRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET /:workspaceId/calendar/feed ─────────────────────────────────────
  // Unified feed: custom events + task due dates + milestones in a date range
  fastify.get(
    '/:workspaceId/calendar/feed',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parseQ = feedQuerySchema.safeParse(request.query);
      if (!parseQ.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'from and to datetime params are required' },
        });
      }

      const { from, to, projectId } = parseQ.data;
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // 1. Custom calendar events
      // An event overlaps the requested range if it starts before the range ends
      // AND ends after the range starts. This correctly handles:
      //   - events that start before the range but end inside it
      //   - events that start inside the range but end after it
      //   - multi-day events that span the entire range
      const events = await prisma.calendarEvent.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          startsAt: { lt: toDate },
          endsAt:   { gt: fromDate },
          ...(projectId ? { projectId } : {}),
        },
        select: eventSelect,
        orderBy: { startsAt: 'asc' },
      });

      // 2. Tasks with due dates in range
      const tasks = await prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          dueDate: { gte: fromDate, lte: toDate },
          ...(projectId ? { projectId } : {}),
        },
        select: {
          id: true,
          identifier: true,
          title: true,
          dueDate: true,
          status: true,
          priority: true,
          projectId: true,
          project: { select: { id: true, name: true, identifier: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      // 3. Milestones with due dates in range
      const milestones = await prisma.milestone.findMany({
        where: {
          dueDate: { gte: fromDate, lte: toDate },
          project: {
            workspaceId,
            deletedAt: null,
            ...(projectId ? { id: projectId } : {}),
          },
        },
        select: {
          id: true,
          name: true,
          dueDate: true,
          isCompleted: true,
          projectId: true,
          project: { select: { id: true, name: true, identifier: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      return reply.send({ events, tasks, milestones });
    }
  );

  // ── GET /:workspaceId/calendar/events ───────────────────────────────────
  fastify.get(
    '/:workspaceId/calendar/events',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const events = await prisma.calendarEvent.findMany({
        where: { workspaceId, deletedAt: null },
        select: eventSelect,
        orderBy: { startsAt: 'asc' },
      });

      return reply.send(events);
    }
  );

  // ── POST /:workspaceId/calendar/events ──────────────────────────────────
  fastify.post(
    '/:workspaceId/calendar/events',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parse = createEventSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid event data', details: parse.error.flatten().fieldErrors },
        });
      }

      const { title, description, startsAt, endsAt, isAllDay, color, projectId, teamId, attendeeIds } = parse.data;

      if (new Date(startsAt) >= new Date(endsAt) && !isAllDay) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'endsAt must be after startsAt' },
        });
      }

      const event = await prisma.calendarEvent.create({
        data: {
          workspaceId,
          createdById: request.user!.id,
          title,
          description: description ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          isAllDay,
          color,
          projectId: projectId ?? null,
          teamId: teamId ?? null,
          attendees: {
            create: [
              // Always include creator as accepted attendee
              { userId: request.user!.id, rsvp: 'ACCEPTED' },
              // Add additional attendees as pending
              ...attendeeIds
                .filter((id) => id !== request.user!.id)
                .map((userId) => ({ userId, rsvp: 'PENDING' as const })),
            ],
          },
        },
        select: eventSelect,
      });

      return reply.status(201).send(event);
    }
  );

  // ── GET /:workspaceId/calendar/events/:eventId ──────────────────────────
  fastify.get(
    '/:workspaceId/calendar/events/:eventId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, eventId } = request.params as { workspaceId: string; eventId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, workspaceId, deletedAt: null },
        select: eventSelect,
      });

      if (!event) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
      }

      return reply.send(event);
    }
  );

  // ── PATCH /:workspaceId/calendar/events/:eventId ────────────────────────
  fastify.patch(
    '/:workspaceId/calendar/events/:eventId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, eventId } = request.params as { workspaceId: string; eventId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, workspaceId, deletedAt: null },
        select: { createdById: true },
      });

      if (!event) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
      }

      const canEdit =
        event.createdById === request.user!.id ||
        ['OWNER', 'ADMIN'].includes(member.role);

      if (!canEdit) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only the event creator or an admin can edit this event' } });
      }

      const parse = updateEventSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid update data', details: parse.error.flatten().fieldErrors },
        });
      }

      const { title, description, startsAt, endsAt, isAllDay, color } = parse.data;

      const updated = await prisma.calendarEvent.update({
        where: { id: eventId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
          ...(endsAt !== undefined && { endsAt: new Date(endsAt) }),
          ...(isAllDay !== undefined && { isAllDay }),
          ...(color !== undefined && { color }),
        },
        select: eventSelect,
      });

      return reply.send(updated);
    }
  );

  // ── PATCH /:workspaceId/calendar/events/:eventId/rsvp ───────────────────
  fastify.patch(
    '/:workspaceId/calendar/events/:eventId/rsvp',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, eventId } = request.params as { workspaceId: string; eventId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parse = z.object({
        rsvp: z.enum(['ACCEPTED', 'DECLINED', 'MAYBE']),
      }).safeParse(request.body);

      if (!parse.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'rsvp must be ACCEPTED, DECLINED, or MAYBE' } });
      }

      const attendee = await prisma.eventAttendee.findUnique({
        where: { eventId_userId: { eventId, userId: request.user!.id } },
      });

      if (!attendee) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'You are not an attendee of this event' } });
      }

      const updated = await prisma.eventAttendee.update({
        where: { eventId_userId: { eventId, userId: request.user!.id } },
        data: { rsvp: parse.data.rsvp },
        select: { rsvp: true, user: { select: { id: true, name: true } } },
      });

      return reply.send(updated);
    }
  );

  // ── DELETE /:workspaceId/calendar/events/:eventId ───────────────────────
  fastify.delete(
    '/:workspaceId/calendar/events/:eventId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, eventId } = request.params as { workspaceId: string; eventId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const event = await prisma.calendarEvent.findFirst({
        where: { id: eventId, workspaceId, deletedAt: null },
        select: { createdById: true },
      });

      if (!event) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Event not found' } });
      }

      const canDelete =
        event.createdById === request.user!.id ||
        ['OWNER', 'ADMIN'].includes(member.role);

      if (!canDelete) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only the event creator or an admin can delete this event' } });
      }

      await prisma.calendarEvent.update({
        where: { id: eventId },
        data: { deletedAt: new Date() },
      });

      return reply.status(204).send();
    }
  );
}
