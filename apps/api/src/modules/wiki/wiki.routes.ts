import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';

const visibilitySchema = z.enum(['WORKSPACE', 'TEAM', 'PROJECT', 'ROLE']).default('WORKSPACE');
const rolesSchema = z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST']).default('MEMBER');

const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
  content: z.any().optional(),
  isPublished: z.boolean().optional(),
  visibility: visibilitySchema.optional(),
  teamId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  visibilityRole: rolesSchema.optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  content: z.any().optional(),
  isPublished: z.boolean().optional(),
  visibility: visibilitySchema.optional(),
  teamId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  visibilityRole: rolesSchema.nullable().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.any().optional(),
});

export async function wikiRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  function ensureModels(reply: FastifyReply) {
    if (!('wikiPage' in prisma) || !('wikiPageVersion' in prisma) || !('wikiTemplate' in prisma)) {
      fastify.log.error('Prisma client is missing Wiki models. Run `npx prisma generate` and migrations.');
      reply.status(500).send({ error: 'MISSING_PRISMA_MODELS', message: 'Prisma client missing Wiki models. Run `npx prisma generate` and apply migrations, then restart the server.' });
      return false;
    }
    return true;
  }

  const workspaceRoleRank = (role: string) => {
    const ranks: Record<string, number> = {
      OWNER: 5,
      ADMIN: 4,
      MANAGER: 3,
      MEMBER: 2,
      GUEST: 1,
    };
    return ranks[role] ?? 0;
  };

  const getWorkspaceMembership = async (workspaceId: string, userId: string) => {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  };

  const getWorkspaceMembershipSets = async (workspaceId: string, userId: string) => {
    const [teamMemberships, leaderTeams, projectMemberships] = await prisma.$transaction([
      prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
      prisma.team.findMany({ where: { workspaceId, leaderId: userId }, select: { id: true } }),
      prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
    ]);

    const teamIds = new Set<string>(teamMemberships.map((m) => m.teamId));
    leaderTeams.forEach((team) => teamIds.add(team.id));
    const projectIds = new Set<string>(projectMemberships.map((m) => m.projectId));

    return { teamIds, projectIds };
  };

  const canAccessWikiPage = async (
    page: { visibility: string; visibilityRole?: string | null; teamId?: string | null; projectId?: string | null },
    membership: { role: string; userId: string },
    membershipSets: { teamIds: Set<string>; projectIds: Set<string> }
  ) => {
    if (['OWNER', 'ADMIN'].includes(membership.role)) return true;
    if (page.visibility === 'WORKSPACE') return true;
    if (page.visibility === 'ROLE') {
      const requiredRank = workspaceRoleRank(page.visibilityRole ?? 'GUEST');
      return workspaceRoleRank(membership.role) >= requiredRank;
    }
    if (page.visibility === 'TEAM' && page.teamId) {
      return membershipSets.teamIds.has(page.teamId);
    }
    if (page.visibility === 'PROJECT' && page.projectId) {
      return membershipSets.projectIds.has(page.projectId);
    }
    return false;
  };

  // Create page
  fastify.post(
    '/:workspaceId/wiki',
    { preHandler: [fastify.authorize('wiki', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createPageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.errors });
      }

    const { title, parentId, content, isPublished, visibility: rawVisibility, teamId, projectId, visibilityRole } = parsed.data;
    const visibility = rawVisibility ?? 'WORKSPACE';

    if (!ensureModels(reply)) return;

    const { workspaceId } = request.params as { workspaceId: string };
    if (visibility === 'TEAM' && !teamId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'teamId is required for TEAM visibility' });
    }
    if (visibility === 'PROJECT' && !projectId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'projectId is required for PROJECT visibility' });
    }
    if (visibility === 'ROLE' && !visibilityRole) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'visibilityRole is required for ROLE visibility' });
    }
    if (visibility !== 'TEAM' && teamId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'teamId may only be provided for TEAM visibility' });
    }
    if (visibility !== 'PROJECT' && projectId) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'projectId may only be provided for PROJECT visibility' });
    }
    if (visibility !== 'ROLE' && visibilityRole) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'visibilityRole may only be provided for ROLE visibility' });
    }

    if (visibility === 'TEAM') {
      const team = await prisma.team.findFirst({ where: { id: teamId!, workspaceId } });
      if (!team) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid teamId for this workspace' });
      }
    }

    if (visibility === 'PROJECT') {
      const project = await prisma.project.findFirst({ where: { id: projectId!, workspaceId } });
      if (!project) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Invalid projectId for this workspace' });
      }
    }

    const visibilityRoleValue = visibility === 'ROLE' ? (visibilityRole ?? null) : null;

    const page = await prisma.wikiPage.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        parentId: parentId ?? null,
        workspaceId,
        createdById: request.user!.id,
        isPublished: Boolean(isPublished) ?? false,
        visibility,
        teamId: teamId ?? null,
        projectId: projectId ?? null,
        visibilityRole: visibilityRoleValue,
      },
    });

    await prisma.wikiPageVersion.create({
      data: {
        pageId: page.id,
        title: page.title,
        content: content ?? null,
        versionNumber: 1,
        createdById: request.user!.id,
      },
    });

    return reply.status(201).send(page);
  });

  // Get page by id with latest version
  fastify.get('/:workspaceId/wiki/:pageId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, pageId } = request.params as { workspaceId: string; pageId: string };

    if (!ensureModels(reply)) return;

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this workspace' });
    }

    const page = await prisma.wikiPage.findFirst({
      where: { id: pageId, workspaceId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!page) return reply.status(404).send({ error: 'NOT_FOUND' });

    const membershipSets = await getWorkspaceMembershipSets(workspaceId, request.user!.id);
    const canAccess = await canAccessWikiPage(page, membership, membershipSets);
    if (!canAccess) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'You do not have access to this wiki page' });
    }

    return reply.send({ ...page, latest: page.versions?.[0] ?? null });
  });

  // Update page (creates a new version)
  fastify.put(
    '/:workspaceId/wiki/:pageId',
    { preHandler: [fastify.authorize('wiki', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, pageId } = request.params as { workspaceId: string; pageId: string };
      const parsed = updatePageSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.errors });

    if (!ensureModels(reply)) return;

    const pageRecord = await prisma.wikiPage.findFirst({ where: { id: pageId, workspaceId } });
    if (!pageRecord) return reply.status(404).send({ error: 'NOT_FOUND' });

    const updateData: Prisma.WikiPageUncheckedUpdateInput = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.isPublished !== undefined) updateData.isPublished = parsed.data.isPublished;
    if (parsed.data.parentId !== undefined) updateData.parentId = parsed.data.parentId;
    if (parsed.data.visibility !== undefined) updateData.visibility = parsed.data.visibility;
    if (parsed.data.visibility === 'TEAM') {
      if (!parsed.data.teamId) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'teamId is required for TEAM visibility' });
      }
      updateData.teamId = parsed.data.teamId;
      updateData.projectId = null;
      updateData.visibilityRole = null;
    }
    if (parsed.data.visibility === 'PROJECT') {
      if (!parsed.data.projectId) {
        return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'projectId is required for PROJECT visibility' });
      }
      updateData.projectId = parsed.data.projectId;
      updateData.teamId = null;
      updateData.visibilityRole = null;
    }
    if (parsed.data.visibility === 'ROLE') {
      updateData.visibilityRole = parsed.data.visibilityRole ?? pageRecord.visibilityRole;
      updateData.teamId = null;
      updateData.projectId = null;
    }
    if (parsed.data.visibility === 'WORKSPACE') {
      updateData.teamId = null;
      updateData.projectId = null;
      updateData.visibilityRole = null;
    }
    if (parsed.data.teamId !== undefined && parsed.data.visibility === undefined) {
      updateData.teamId = parsed.data.teamId;
    }
    if (parsed.data.projectId !== undefined && parsed.data.visibility === undefined) {
      updateData.projectId = parsed.data.projectId;
    }
    if (parsed.data.visibilityRole !== undefined && parsed.data.visibility === undefined) {
      updateData.visibilityRole = parsed.data.visibilityRole;
    }

    await prisma.wikiPage.update({
      where: { id: pageId },
      data: updateData,
    });

    // create version snapshot
    const latest = await prisma.wikiPageVersion.findMany({ where: { pageId }, orderBy: { versionNumber: 'desc' }, take: 1 });
    const nextVersion = (latest?.[0]?.versionNumber ?? 0) + 1;

    const versionData: any = {
      pageId,
      title: parsed.data.title ?? pageRecord?.title ?? '',
      versionNumber: nextVersion,
      createdById: request.user!.id,
    };
    if (parsed.data.content !== undefined) {
      versionData.content = parsed.data.content;
    }
    await prisma.wikiPageVersion.create({
      data: versionData,
    });

    return reply.send({ updated: true });
  });

  fastify.delete(
    '/:workspaceId/wiki/:pageId',
    { preHandler: [fastify.authorize('wiki', 'delete')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, pageId } = request.params as { workspaceId: string; pageId: string };
      if (!ensureModels(reply)) return;

      const page = await prisma.wikiPage.findFirst({ where: { id: pageId, workspaceId } });
      if (!page) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Wiki page not found' });

      await prisma.$transaction([
        prisma.wikiPageVersion.deleteMany({ where: { pageId } }),
        prisma.wikiPage.delete({ where: { id: pageId } }),
      ]);

      return reply.send({ deleted: true });
    }
  );

  // List pages tree for workspace
  // List pages tree for workspace
  fastify.get('/:workspaceId/wiki', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };

    if (!ensureModels(reply)) return;

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this workspace' });
    }

    if (['OWNER', 'ADMIN'].includes(membership.role)) {
      const pages = await prisma.wikiPage.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
      return reply.send(pages);
    }

    const membershipSets = await getWorkspaceMembershipSets(workspaceId, request.user!.id);
    const pages = await prisma.wikiPage.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
    const visiblePages = pages.filter((page) => canAccessWikiPage(page, membership, membershipSets));

    return reply.send(visiblePages);
  });

  fastify.get('/:workspaceId/wiki/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    if (!ensureModels(reply)) return;
    const templates = await prisma.wikiTemplate.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
    return reply.send(templates);
  });

  fastify.post(
    '/:workspaceId/wiki/templates',
    { preHandler: [fastify.authorize('wiki', 'create')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const parsed = createTemplateSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.errors });
      if (!ensureModels(reply)) return;

    const template = await prisma.wikiTemplate.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        content: parsed.data.content ?? null,
        workspaceId,
        createdById: request.user!.id,
      },
    });

    return reply.status(201).send(template);
  });

  // Get versions for a page
  fastify.get('/:workspaceId/wiki/:pageId/versions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, pageId } = request.params as { workspaceId: string; pageId: string };
    if (!ensureModels(reply)) return;
    const versions = await prisma.wikiPageVersion.findMany({ where: { pageId }, orderBy: { versionNumber: 'desc' } });
    return reply.send(versions);
  });

  // Restore a version
  fastify.post(
    '/:workspaceId/wiki/:pageId/versions/:versionId/restore',
    { preHandler: [fastify.authorize('wiki', 'update')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, pageId, versionId } = request.params as { workspaceId: string; pageId: string; versionId: string };

    if (!ensureModels(reply)) return;

    const version = await prisma.wikiPageVersion.findUnique({ where: { id: versionId } });
    if (!version || version.pageId !== pageId) return reply.status(404).send({ error: 'NOT_FOUND' });

    // create a new version as the restoration
    const latest = await prisma.wikiPageVersion.findMany({ where: { pageId }, orderBy: { versionNumber: 'desc' }, take: 1 });
    const nextVersion = (latest?.[0]?.versionNumber ?? 0) + 1;

    const restoredData: any = {
      pageId,
      title: version.title,
      versionNumber: nextVersion,
      createdById: request.user!.id,
    };
    if (version.content !== undefined) {
      restoredData.content = version.content;
    }
    await prisma.wikiPageVersion.create({
      data: restoredData,
    });

    return reply.send({ restoredVersion: versionId });
  });
}
