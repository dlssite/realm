/**
 * Activity routes — /api/v1/workspaces/:workspaceId/activity
 *
 * GET  /:workspaceId/activity          — paginated audit log feed (cursor-based)
 * POST /:workspaceId/activity          — write a single audit log entry (internal use)
 *
 * Query params for GET:
 *   entityType  — filter by AuditEntityType enum value
 *   entityId    — filter by a specific resource UUID
 *   actorId     — filter by who performed the action
 *   action      — filter by AuditAction enum value
 *   limit       — page size (default 30, max 100)
 *   cursor      — ISO date string; returns events created before this timestamp
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';

// ── Validation schemas ────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  entityType: z
    .enum(['TASK', 'PROJECT', 'MILESTONE', 'WIKI_PAGE', 'COMMENT', 'CHANNEL', 'FILE', 'WORKSPACE', 'TEAM', 'MEMBER'])
    .optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z
    .enum(['CREATED', 'UPDATED', 'DELETED', 'COMMENTED', 'ASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'MOVED', 'RESTORED', 'UPLOADED', 'MENTIONED'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().datetime().optional(),
});

const writeEntrySchema = z.object({
  entityType: z.enum(['TASK', 'PROJECT', 'MILESTONE', 'WIKI_PAGE', 'COMMENT', 'CHANNEL', 'FILE', 'WORKSPACE', 'TEAM', 'MEMBER']),
  entityId: z.string().uuid(),
  entityTitle: z.string().max(255).optional(),
  action: z.enum(['CREATED', 'UPDATED', 'DELETED', 'COMMENTED', 'ASSIGNED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'MOVED', 'RESTORED', 'UPLOADED', 'MENTIONED']),
  meta: z.record(z.unknown()).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET /:workspaceId/activity ─────────────────────────────────────────────
  fastify.get(
    '/:workspaceId/activity',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parseQ = listQuerySchema.safeParse(request.query);
      if (!parseQ.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
      }

      const { entityType, entityId, actorId, action, limit, cursor } = parseQ.data;

      const where: Prisma.AuditLogWhereInput = {
        workspaceId,
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(actorId && { actorId }),
        ...(action && { action }),
        ...(cursor && { createdAt: { lt: new Date(cursor) } }),
      };

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // fetch one extra to determine if there is a next page
        select: {
          id: true,
          createdAt: true,
          entityType: true,
          entityId: true,
          entityTitle: true,
          action: true,
          meta: true,
          actor: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      const hasNextPage = logs.length > limit;
      const items = hasNextPage ? logs.slice(0, limit) : logs;
      const nextCursor = hasNextPage ? items[items.length - 1]?.createdAt.toISOString() : null;

      return reply.send({ items, nextCursor, hasNextPage });
    }
  );

  // ── POST /:workspaceId/activity ────────────────────────────────────────────
  // Called internally by other route handlers after writes.
  // Also exposed here so frontend can write activity for client-side actions.
  fastify.post(
    '/:workspaceId/activity',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parse = writeEntrySchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid activity entry', details: parse.error.flatten().fieldErrors },
        });
      }

      const { entityType, entityId, entityTitle, action, meta } = parse.data;

      const log = await prisma.auditLog.create({
        data: {
          workspaceId,
          actorId: request.user!.id,
          entityType,
          entityId,
          entityTitle: entityTitle ?? null,
          action,
          meta: (meta as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
        select: {
          id: true,
          createdAt: true,
          entityType: true,
          entityId: true,
          entityTitle: true,
          action: true,
          meta: true,
          actor: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      return reply.status(201).send(log);
    }
  );
}
