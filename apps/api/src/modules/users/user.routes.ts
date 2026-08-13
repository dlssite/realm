import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { PasswordService } from '../../core/auth/auth.service';

// ── Validation schemas ────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * User profile routes.
 * All routes require an authenticated session.
 */
export async function userRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/users/me
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        workspaceMembers: {
          select: {
            role: true,
            workspace: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    return reply.send(user);
  });

  // PATCH /api/v1/users/me  — update display name and/or avatar URL
  fastify.patch('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { name, avatarUrl } = parseResult.data;

    const updated = await prisma.user.update({
      where: { id: request.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.send(updated);
  });

  // POST /api/v1/users/me/change-password
  fastify.post(
    '/me/change-password',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = changePasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid password data',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const { currentPassword, newPassword } = parseResult.data;

      const user = await prisma.user.findUnique({
        where: { id: request.user!.id },
        select: { passwordHash: true },
      });

      if (!user) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const isValid = await PasswordService.verify(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.status(400).send({
          error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
        });
      }

      const newHash = await PasswordService.hash(newPassword);

      await prisma.user.update({
        where: { id: request.user!.id },
        data: { passwordHash: newHash },
      });

      return reply.send({ success: true });
    }
  );
}
