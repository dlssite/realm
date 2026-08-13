/**
 * Notification routes — /api/v1/notifications
 *
 * GET  /stream          — SSE stream; client subscribes once on app load
 * GET  /               — paginated inbox (REST, same data as stream history)
 * GET  /unread-count   — lightweight badge count poll fallback
 * PATCH /:id/read      — mark one notification read
 * POST /read-all       — mark all notifications read
 * DELETE /:id          — dismiss a single notification
 *
 * All routes are user-scoped (no workspaceId needed in the path).
 * The recipient is always request.user.id from the session.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { NotificationService, sseRegistry } from '../../core/notifications/notification.service';
import { SessionService } from '../../core/auth/session.service';

const listQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit:      z.coerce.number().int().min(1).max(100).default(30),
  cursor:     z.string().datetime().optional(),
});

export async function notificationRoutes(fastify: FastifyInstance) {

  // ── SSE stream ─────────────────────────────────────────────────────────────
  // Does NOT use the standard authenticate preHandler because we need to manage
  // the raw response stream ourselves (preHandler would close it on reply.send).
  // Instead we authenticate manually from the ?token= query param.
  fastify.get(
    '/stream',
    { websocket: false },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Authenticate via query token (EventSource can't set headers)
      const { token } = request.query as { token?: string };
      if (!token) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'token query param required' } });
      }

      const session = await SessionService.validateSession(token);
      if (!session?.user) {
        return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
      }

      const userId = session.user.id;
      const res = reply.raw;

      // SSE headers
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no', // disable nginx/caddy buffering
      });

      // Register connection
      sseRegistry.add(userId, res);

      // Send initial unread count so the Bell badge is correct immediately
      const count = await NotificationService.unreadCount(userId);
      res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount: count })}\n\n`);

      // Keep-alive ping every 25 s to prevent proxy timeouts
      const keepAlive = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { clearInterval(keepAlive); }
      }, 25_000);

      // Clean up on disconnect
      request.raw.on('close', () => {
        clearInterval(keepAlive);
        sseRegistry.remove(userId, res);
      });

      // Prevent Fastify from closing the response — we own the stream now
      reply.hijack();
    }
  );

  // All remaining routes require normal session auth
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET / (paginated inbox) ────────────────────────────────────────────────
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = listQuerySchema.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' } });
    }

    const { unreadOnly, limit, cursor } = parse.data;

    const opts: { unreadOnly?: boolean; limit?: number; cursor?: string } = { limit };
    if (unreadOnly !== undefined) opts.unreadOnly = unreadOnly;
    if (cursor     !== undefined) opts.cursor     = cursor;

    const result = await NotificationService.list(request.user!.id, opts);

    return reply.send(result);
  });

  // ── GET /unread-count ──────────────────────────────────────────────────────
  fastify.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    const count = await NotificationService.unreadCount(request.user!.id);
    return reply.send({ count });
  });

  // ── PATCH /:id/read ────────────────────────────────────────────────────────
  fastify.patch('/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const updated = await NotificationService.markRead(id, request.user!.id);
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }
    return reply.send(updated);
  });

  // ── POST /read-all ─────────────────────────────────────────────────────────
  fastify.post('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const count = await NotificationService.markAllRead(request.user!.id);
    // Push a SSE event so all open tabs update their badge simultaneously
    sseRegistry.push(request.user!.id, 'read_all', { count });
    return reply.send({ count });
  });

  // ── DELETE /:id ────────────────────────────────────────────────────────────
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const removed = await NotificationService.remove(id, request.user!.id);
    if (!removed) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }
    return reply.status(204).send();
  });
}
