import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { PasswordService } from '../../core/auth/auth.service';
import { createPresignedUploadUrl, createPresignedDownloadUrl, objectExists, deleteObject } from '../../infrastructure/storage/minio';
import { randomUUID } from 'crypto';

// ── Validation schemas ────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const avatarUploadUrlSchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/, 'Only jpeg, png, gif, webp images are allowed'),
});

const confirmAvatarSchema = z.object({
  storageKey: z.string().min(1).max(1024),
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

  // POST /api/v1/users/me/avatar/upload-url — get a presigned PUT URL for avatar upload
  fastify.post('/me/avatar/upload-url', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = avatarUploadUrlSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid upload request',
          details: parse.error.flatten().fieldErrors,
        },
      });
    }

    const { contentType } = parse.data;
    const ext = contentType.split('/')[1]; // jpeg | png | gif | webp
    const fileId = randomUUID();
    const storageKey = `users/${request.user!.id}/avatar/${fileId}.${ext}`;

    const { uploadUrl } = await createPresignedUploadUrl(storageKey, contentType);

    return reply.send({ uploadUrl, storageKey });
  });

  // POST /api/v1/users/me/avatar/confirm — verify upload and persist the public URL
  fastify.post('/me/avatar/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = confirmAvatarSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid confirm request',
          details: parse.error.flatten().fieldErrors,
        },
      });
    }

    const { storageKey } = parse.data;

    // Verify the object was actually uploaded
    const exists = await objectExists(storageKey);
    if (!exists) {
      return reply.status(400).send({
        error: { code: 'UPLOAD_NOT_FOUND', message: 'Avatar file not found in storage. Complete the upload first.' },
      });
    }

    // Generate a long-lived presigned download URL (10 years) to use as the persistent avatarUrl
    const TEN_YEARS_SECONDS = 10 * 365 * 24 * 60 * 60;
    const avatarUrl = await createPresignedDownloadUrl(storageKey, TEN_YEARS_SECONDS);

    // Delete old avatar object from storage if it was a user-managed one
    const existing = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl) {
      try {
        // Only delete if it's a storage-managed key (users/{id}/avatar/...)
        const url = new URL(existing.avatarUrl);
        const oldKey = url.pathname.replace(/^\/[^/]+\//, ''); // strip bucket prefix from path
        if (oldKey.startsWith(`users/${request.user!.id}/avatar/`)) {
          await deleteObject(oldKey);
        }
      } catch {
        // Non-critical — ignore cleanup errors
      }
    }

    const updated = await prisma.user.update({
      where: { id: request.user!.id },
      data: { avatarUrl },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true, updatedAt: true },
    });

    return reply.send(updated);
  });

  // DELETE /api/v1/users/me/avatar — clear avatar URL
  fastify.delete('/me/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
    const existing = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { avatarUrl: true },
    });

    // Try to remove the object from storage
    if (existing?.avatarUrl) {
      try {
        const url = new URL(existing.avatarUrl);
        const oldKey = url.pathname.replace(/^\/[^/]+\//, '');
        if (oldKey.startsWith(`users/${request.user!.id}/avatar/`)) {
          await deleteObject(oldKey);
        }
      } catch {
        // Non-critical
      }
    }

    const updated = await prisma.user.update({
      where: { id: request.user!.id },
      data: { avatarUrl: null },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true, updatedAt: true },
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
