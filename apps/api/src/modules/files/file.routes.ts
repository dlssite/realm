/**
 * File routes — /api/v1/workspaces/:workspaceId/files
 *
 * Upload flow:
 *   1. POST /upload-url  → returns presigned PUT URL + storageKey
 *   2. Client PUTs directly to MinIO (no API involvement)
 *   3. POST /confirm     → API verifies object exists, creates FileRecord in DB
 *
 * All routes require authentication and workspace membership.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../../infrastructure/database/prisma';
import {
  BUCKET,
  buildStorageKey,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteObject,
  objectExists,
} from '../../infrastructure/storage/minio';

// ── Validation schemas ────────────────────────────────────────────────────────

const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(512),
  contentType: z.string().min(1).max(255),
  projectId: z.string().uuid().optional(),
});

const confirmUploadSchema = z.object({
  storageKey: z.string().min(1).max(1024),
  filename: z.string().min(1).max(512),
  contentType: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  projectId: z.string().uuid().optional(),
});

const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function fileRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── POST /:workspaceId/files/upload-url ─────────────────────────────────
  fastify.post(
    '/:workspaceId/files/upload-url',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parse = uploadUrlSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid upload request', details: parse.error.flatten().fieldErrors },
        });
      }

      const { filename, contentType } = parse.data;
      const fileId = randomUUID();
      const storageKey = buildStorageKey(workspaceId, fileId, filename);

      const { uploadUrl } = await createPresignedUploadUrl(storageKey, contentType);

      return reply.status(200).send({ uploadUrl, storageKey, fileId });
    }
  );

  // ── POST /:workspaceId/files/confirm ────────────────────────────────────
  fastify.post(
    '/:workspaceId/files/confirm',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parse = confirmUploadSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid confirm payload', details: parse.error.flatten().fieldErrors },
        });
      }

      const { storageKey, filename, contentType, sizeBytes, projectId } = parse.data;

      // Verify the object actually landed in MinIO before creating the DB record
      const exists = await objectExists(storageKey);
      if (!exists) {
        return reply.status(400).send({
          error: { code: 'UPLOAD_NOT_FOUND', message: 'File not found in storage. Complete the upload first.' },
        });
      }

      const fileRecord = await prisma.fileRecord.create({
        data: {
          workspaceId,
          uploadedById: request.user!.id,
          projectId: projectId ?? null,
          storageKey,
          bucket: BUCKET,
          filename,
          contentType,
          sizeBytes: BigInt(sizeBytes),
        },
        select: {
          id: true,
          createdAt: true,
          filename: true,
          contentType: true,
          sizeBytes: true,
          storageKey: true,
          projectId: true,
          uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      return reply.status(201).send({
        ...fileRecord,
        sizeBytes: fileRecord.sizeBytes.toString(),
      });
    }
  );

  // ── GET /:workspaceId/files ─────────────────────────────────────────────
  fastify.get(
    '/:workspaceId/files',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const parseQ = listQuerySchema.safeParse(request.query);
      if (!parseQ.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query params' } });
      }

      const { projectId, limit, cursor } = parseQ.data;

      const files = await prisma.fileRecord.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          ...(projectId ? { projectId } : {}),
          ...(cursor ? { id: { lt: cursor } } : {}),
        },
        select: {
          id: true,
          createdAt: true,
          filename: true,
          contentType: true,
          sizeBytes: true,
          projectId: true,
          project: { select: { id: true, name: true, identifier: true } },
          uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return reply.send(
        files.map((f) => ({ ...f, sizeBytes: f.sizeBytes.toString() }))
      );
    }
  );

  // ── GET /:workspaceId/files/:fileId/download-url ────────────────────────
  fastify.get(
    '/:workspaceId/files/:fileId/download-url',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, fileId } = request.params as { workspaceId: string; fileId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const file = await prisma.fileRecord.findFirst({
        where: { id: fileId, workspaceId, deletedAt: null },
        select: { storageKey: true, filename: true, contentType: true },
      });

      if (!file) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
      }

      const downloadUrl = await createPresignedDownloadUrl(file.storageKey);

      return reply.send({ downloadUrl, filename: file.filename, contentType: file.contentType });
    }
  );

  // ── DELETE /:workspaceId/files/:fileId ──────────────────────────────────
  fastify.delete(
    '/:workspaceId/files/:fileId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, fileId } = request.params as { workspaceId: string; fileId: string };

      const member = await assertMember(workspaceId, request.user!.id);
      if (!member) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a workspace member' } });
      }

      const file = await prisma.fileRecord.findFirst({
        where: { id: fileId, workspaceId, deletedAt: null },
        select: { id: true, storageKey: true, uploadedById: true },
      });

      if (!file) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'File not found' } });
      }

      // Only uploader or Admin/Owner can delete
      const canDelete =
        file.uploadedById === request.user!.id ||
        ['OWNER', 'ADMIN'].includes(member.role);

      if (!canDelete) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only the uploader or an admin can delete this file' } });
      }

      // Soft-delete the record; hard-delete the object from storage
      await prisma.fileRecord.update({
        where: { id: fileId },
        data: { deletedAt: new Date() },
      });

      await deleteObject(file.storageKey);

      return reply.status(204).send();
    }
  );
}
