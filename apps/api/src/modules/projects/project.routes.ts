import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { generateIdentifier } from '../../core/utils/identifier';
import { writeAuditLog } from '../../core/audit/audit.service';
import { NotificationService } from '../../core/notifications/notification.service';

// ── Validation Schemas ──────────────────────────────────────────────────────
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  teamId: z.string().uuid().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const createMilestoneSchema = z.object({
  name: z.string().min(1).max(255),
  dueDate: z.string().datetime().optional(),
});

const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isCompleted: z.boolean().optional(),
});

const createGoalSchema = z.object({
  name: z.string().min(1).max(255),
  targetValue: z.number().positive().default(100),
  currentValue: z.number().min(0).default(0),
});

const updateGoalSchema = createGoalSchema.partial();

// ── Route Handler ───────────────────────────────────────────────────────────
export async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  const getUserPermissions = async (workspaceId: string, userId: string) => {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) return null;

    const userTeams = await prisma.teamMember.findMany({
      where: { userId, team: { workspaceId } },
      select: { teamId: true },
    });

    const teamIds = userTeams.map((t) => t.teamId);
    const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role);
    return { membership, teamIds, isManager };
  };

  // ── GET /:workspaceId/projects ────────────────────────────────────────────
  fastify.get('/:workspaceId/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const perm = await getUserPermissions(workspaceId, request.user!.id);
    if (!perm) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });

    const whereClause: any = { workspaceId, deletedAt: null };
    if (!perm.isManager) {
      whereClause.OR = [
        { teamId: null },
        { teamId: { in: perm.teamIds } },
        { members: { some: { userId: request.user!.id } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        createdBy:  { select: { id: true, name: true, avatarUrl: true } },
        team:       { select: { id: true, name: true, leaderId: true } },
        members:    { select: { userId: true, role: true } },
        tasks:      { select: { id: true, status: true } },
        milestones: { select: { id: true, isCompleted: true } },
        _count:     { select: { tasks: true, milestones: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reply.send(projects);
  });

  // ── POST /:workspaceId/projects ───────────────────────────────────────────
  fastify.post('/:workspaceId/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const perm = await getUserPermissions(workspaceId, request.user!.id);
    if (!perm) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of workspace' } });

    const parseResult = createProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid project data', details: parseResult.error.flatten().fieldErrors },
      });
    }

    const { name, description, status, teamId } = parseResult.data;

    if (teamId && !perm.isManager && !perm.teamIds.includes(teamId)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'You can only create projects for teams you are a member of' },
      });
    }

    const identifier = await generateIdentifier(workspaceId, 'PROJ', 'project');

    const project = await prisma.project.create({
      data: {
        workspaceId,
        createdById: request.user!.id,
        identifier,
        name,
        ...(status !== undefined && { status }),
        description: description ?? null,
        teamId:      teamId      ?? null,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        team:      { select: { id: true, name: true, leaderId: true } },
        _count:    { select: { tasks: true, milestones: true } },
      },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'PROJECT', entityId: project.id,
      entityTitle: `${project.identifier} · ${project.name}`,
      action: 'CREATED',
      meta: {
        status:   project.status,
        teamId:   project.teamId ?? null,
        teamName: project.team?.name ?? null,
      },
    });

    return reply.status(201).send(project);
  });

  // ── GET /:workspaceId/projects/:projectId ─────────────────────────────────
  fastify.get('/:workspaceId/projects/:projectId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const perm = await getUserPermissions(workspaceId, request.user!.id);
    if (!perm) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
      include: {
        createdBy:  { select: { id: true, name: true, avatarUrl: true } },
        team:       { select: { id: true, name: true, leaderId: true } },
        milestones: { orderBy: { dueDate: 'asc' } },
        goals:      { orderBy: { createdAt: 'asc' } },
        tasks: {
          where: { deletedAt: null, parentId: null },
          select: { id: true, identifier: true, title: true, status: true, priority: true, dueDate: true, assignee: { select: { id: true, name: true } } },
        },
        members: { select: { userId: true, role: true } },
        _count:  { select: { tasks: true, milestones: true } },
      },
    });

    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });

    if (
      project.teamId &&
      !perm.isManager &&
      !perm.teamIds.includes(project.teamId) &&
      !project.members.some((m) => m.userId === request.user!.id)
    ) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this team project' } });
    }

    return reply.send(project);
  });

  // ── GET /:workspaceId/projects/:projectId/assignees ───────────────────────
  fastify.get('/:workspaceId/projects/:projectId/assignees', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
      select: { teamId: true },
    });
    if (!project) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });

    if (project.teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: project.teamId },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
      return reply.send(teamMembers.map((tm) => tm.user));
    }

    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
    return reply.send(workspaceMembers.map((wm) => wm.user));
  });

  // ── POST /:workspaceId/projects/:projectId/members ───────────────────────
  // Add a user explicitly to a project (separate from team membership).
  fastify.post('/:workspaceId/projects/:projectId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const perm = await getUserPermissions(workspaceId, request.user!.id);
    if (!perm || !perm.isManager) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace managers can add project members' } });
    }

    const parse = z.object({ userId: z.string().uuid(), role: z.enum(['LEAD', 'MEMBER']).default('MEMBER') }).safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'userId is required' } });
    }

    const { userId, role } = parse.data;

    // Verify target is a workspace member
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!wsMember) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'User is not a member of this workspace' } });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { identifier: true, name: true },
    });
    if (!project) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role },
      create: { projectId, userId, role },
    });

    const addedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });

    const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } });

    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'PROJECT', entityId: projectId,
      entityTitle: `${project.identifier} · ${project.name}`,
      action: 'UPDATED',
      meta: { memberAdded: addedUser?.name ?? userId, memberId: userId },
    });

    // ── Notification ────────────────────────────────────────────────────────
    await NotificationService.send({
      recipientId:  userId,
      workspaceId,
      type:         'PROJECT_MEMBER_ADDED',
      title:        `${actor?.name ?? 'Someone'} added you to project "${project.name}"`,
      body:         role === 'LEAD' ? 'You have been assigned as project lead.' : undefined,
      entityType:   'PROJECT',
      entityId:     projectId,
      entityTitle:  `${project.identifier} · ${project.name}`,
      actorId:      request.user!.id,
      actorName:    actor?.name ?? null,
    });

    return reply.status(201).send({ ...member, user: addedUser });
  });

  // ── PATCH /:workspaceId/projects/:projectId ───────────────────────────────
  fastify.patch('/:workspaceId/projects/:projectId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const parseResult = updateProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid update data' } });
    }

    const existing = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, identifier: true, name: true, status: true, teamId: true },
    });
    if (!existing) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const { name, description, status, teamId } = parseResult.data;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name        !== undefined && { name }),
        ...(status      !== undefined && { status }),
        ...(description !== undefined && { description: description ?? null }),
        ...(teamId      !== undefined && { teamId: teamId ?? null }),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        _count:    { select: { tasks: true, milestones: true } },
      },
    });

    const entityTitle = `${existing.identifier} · ${updated.name}`;

    // Status change gets its own action for richer feed display
    if (status !== undefined && status !== existing.status) {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'PROJECT', entityId: projectId, entityTitle,
        action: 'STATUS_CHANGED',
        meta: { from: existing.status, to: status },
      });
    }

    // Other field changes
    const changedFields = (['name', 'description', 'teamId'] as const).filter(
      (f) => parseResult.data[f] !== undefined,
    );
    if (changedFields.length > 0) {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'PROJECT', entityId: projectId, entityTitle,
        action: 'UPDATED',
        meta: { fields: changedFields },
      });
    }

    return reply.send(updated);
  });

  // ── DELETE /:workspaceId/projects/:projectId ──────────────────────────────
  fastify.delete('/:workspaceId/projects/:projectId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true, identifier: true, name: true },
    });

    await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });

    if (project) {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'PROJECT', entityId: projectId,
        entityTitle: `${project.identifier} · ${project.name}`,
        action: 'DELETED',
      });
    }

    return reply.status(204).send();
  });

  // ── MILESTONES ─────────────────────────────────────────────────────────────

  fastify.post('/:workspaceId/projects/:projectId/milestones', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const parse = createMilestoneSchema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid milestone data' } });

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        createdById: request.user!.id,
        name:    parse.data.name,
        dueDate: parse.data.dueDate ? new Date(parse.data.dueDate) : null,
      },
    });

    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'MILESTONE', entityId: milestone.id,
      entityTitle: milestone.name,
      action: 'CREATED',
      meta: { projectId },
    });

    return reply.status(201).send(milestone);
  });

  fastify.patch('/:workspaceId/projects/:projectId/milestones/:milestoneId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, milestoneId } = request.params as { workspaceId: string; projectId: string; milestoneId: string };

    const parse = updateMilestoneSchema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid milestone update data' } });

    const existing = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { name: true, isCompleted: true },
    });

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(parse.data.name        !== undefined && { name:        parse.data.name }),
        ...(parse.data.isCompleted !== undefined && { isCompleted: parse.data.isCompleted }),
        ...(parse.data.dueDate     !== undefined && { dueDate:     parse.data.dueDate ? new Date(parse.data.dueDate) : null }),
      },
    });

    // If milestone was just marked complete, use a dedicated action
    if (parse.data.isCompleted === true && existing?.isCompleted === false) {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'MILESTONE', entityId: milestoneId,
        entityTitle: updated.name,
        action: 'STATUS_CHANGED',
        meta: { from: 'IN_PROGRESS', to: 'COMPLETED' },
      });

      // ── Notification: tell every project member the milestone is done ──────
      const projectId = updated.projectId;
      const [projectMembers, wsMembers, actor] = await Promise.all([
        // Explicit project members
        prisma.projectMember.findMany({
          where: { projectId },
          select: { userId: true },
        }),
        // Fall back: all workspace members for team-less projects
        prisma.project.findUnique({
          where: { id: projectId },
          select: {
            identifier: true, name: true,
            teamId: true,
            team: { select: { members: { select: { userId: true } } } },
          },
        }),
        prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } }),
      ]);

      // Build recipient set — prefer team members, fall back to project members
      const recipientIds = new Set<string>();
      if (wsMembers?.team?.members?.length) {
        wsMembers.team.members.forEach((m) => recipientIds.add(m.userId));
      } else {
        projectMembers.forEach((m) => recipientIds.add(m.userId));
      }
      recipientIds.delete(request.user!.id); // don't notify self

      const projectTitle = wsMembers ? `${wsMembers.identifier} · ${wsMembers.name}` : projectId;

      await Promise.all(
        Array.from(recipientIds).map((recipientId) =>
          NotificationService.send({
            recipientId,
            workspaceId,
            type:        'MILESTONE_COMPLETED',
            title:       `Milestone "${updated.name}" was completed`,
            body:        `In project ${projectTitle}`,
            entityType:  'MILESTONE',
            entityId:    milestoneId,
            entityTitle: updated.name,
            actorId:     request.user!.id,
            actorName:   actor?.name ?? null,
          })
        )
      );
    } else {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'MILESTONE', entityId: milestoneId,
        entityTitle: updated.name,
        action: 'UPDATED',
      });
    }

    return reply.send(updated);
  });

  fastify.delete('/:workspaceId/projects/:projectId/milestones/:milestoneId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, milestoneId } = request.params as { workspaceId: string; projectId: string; milestoneId: string };

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { name: true },
    });

    await prisma.milestone.delete({ where: { id: milestoneId } });

    if (milestone) {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'MILESTONE', entityId: milestoneId,
        entityTitle: milestone.name,
        action: 'DELETED',
      });
    }

    return reply.status(204).send();
  });

  // ── GOALS ──────────────────────────────────────────────────────────────────

  fastify.post('/:workspaceId/projects/:projectId/goals', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };

    const parse = createGoalSchema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid goal data' } });

    const goal = await prisma.goal.create({
      data: {
        projectId,
        createdById:  request.user!.id,
        name:         parse.data.name,
        targetValue:  parse.data.targetValue,
        currentValue: parse.data.currentValue,
      },
    });

    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'MILESTONE', entityId: goal.id,   // goals live under PROJECT context
      entityTitle: goal.name,
      action: 'CREATED',
      meta: { projectId, targetValue: goal.targetValue },
    });

    return reply.status(201).send(goal);
  });

  fastify.patch('/:workspaceId/projects/:projectId/goals/:goalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, goalId } = request.params as { workspaceId: string; projectId: string; goalId: string };

    const parse = updateGoalSchema.safeParse(request.body);
    if (!parse.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid goal update data' } });

    const { name, targetValue, currentValue } = parse.data;

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(name         !== undefined && { name }),
        ...(targetValue  !== undefined && { targetValue }),
        ...(currentValue !== undefined && { currentValue }),
      },
    });

    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'MILESTONE', entityId: goalId,
      entityTitle: updated.name,
      action: 'UPDATED',
      meta: {
        ...(currentValue !== undefined && { currentValue, targetValue: updated.targetValue }),
      },
    });

    return reply.send(updated);
  });

  fastify.delete('/:workspaceId/projects/:projectId/goals/:goalId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, goalId } = request.params as { workspaceId: string; projectId: string; goalId: string };

    const goal = await prisma.goal.findUnique({ where: { id: goalId }, select: { name: true } });
    await prisma.goal.delete({ where: { id: goalId } });

    if (goal) {
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'MILESTONE', entityId: goalId,
        entityTitle: goal.name,
        action: 'DELETED',
      });
    }

    return reply.status(204).send();
  });
}
