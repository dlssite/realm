import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';
import { slugify } from '@realm/utils';
import crypto from 'node:crypto';
import { writeAuditLog } from '../../core/audit/audit.service';
import { NotificationService } from '../../core/notifications/notification.service';

// ── Validation schemas ────────────────────────────────────────────────────────

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

const inviteSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'GUEST']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'GUEST']),
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  leaderId: z.string().uuid().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  leaderId: z.string().uuid().nullable().optional(),
});

const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});

// ── Route handler ─────────────────────────────────────────────────────────────

export async function workspaceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  const getWorkspaceMembership = (workspaceId: string, userId: string) =>
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

  // ── GET / ─────────────────────────────────────────────────────────────────
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: request.user!.id },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(
      memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
      }))
    );
  });

  // ── GET /:workspaceId/nav-counts ──────────────────────────────────────────
  fastify.get('/:workspaceId/nav-counts', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMembership(workspaceId, userId);
    if (!membership) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member' } });

    const now = new Date();

    const [projectCount, overdueTaskCount, unreadChannelCount] = await Promise.all([
      prisma.project.count({ where: { workspaceId, deletedAt: null, status: 'ACTIVE' } }),
      prisma.task.count({
        where: { workspaceId, deletedAt: null, assigneeId: userId, dueDate: { lt: now }, status: { notIn: ['DONE', 'CANCELLED'] } },
      }),
      (async () => {
        const memberships = await prisma.channelMember.findMany({
          where: { userId, channel: { workspaceId, isArchived: false } },
          select: { channelId: true, lastReadAt: true },
        });
        const counts = await Promise.all(
          memberships.map((m) =>
            prisma.chatMessage.count({
              where: { channelId: m.channelId, deletedAt: null, senderId: { not: userId }, createdAt: { gt: m.lastReadAt } },
            })
          )
        );
        return counts.filter((c) => c > 0).length;
      })(),
    ]);

    return reply.send({ projects: projectCount, tasks: overdueTaskCount, chat: unreadChannelCount });
  });

  // ── POST / (Create workspace) ─────────────────────────────────────────────
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = createWorkspaceSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid workspace name' } });
    }

    const { name } = parseResult.data;
    const slug = slugify(name);
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const workspace = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ws = await tx.workspace.create({
        data: { name, slug: uniqueSlug, createdById: request.user!.id },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId: request.user!.id, role: 'OWNER' },
      });
      return ws;
    });

    return reply.status(201).send(workspace);
  });

  // ── GET /:workspaceId/members ─────────────────────────────────────────────
  fastify.get('/:workspaceId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'You are not a member of this workspace' } });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
    return reply.send(members);
  });

  // ── GET /:workspaceId/members/:userId/card ───────────────────────────────
  // Returns a rich profile card payload for a single workspace member:
  //   • user basics (name, email, avatarUrl)
  //   • workspace role + join date
  //   • teams they belong to (with leader flag)
  //   • projects they are a member of (with their project role)
  //   • assigned tasks summary (up to 5 active, counts by status)
  // Available to any workspace member — the data is non-sensitive.
  fastify.get('/:workspaceId/members/:userId/card', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, userId } = request.params as { workspaceId: string; userId: string };

    // Caller must be a workspace member
    const callerMembership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!callerMembership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    // Load the target member
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } } },
    });
    if (!wsMember) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Member not found in this workspace' } });
    }

    // Teams
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: { select: { id: true, name: true, leaderId: true } },
      },
    });
    // Only include teams that belong to this workspace
    const workspaceTeamIds = await prisma.team.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const wsTeamIdSet = new Set(workspaceTeamIds.map(t => t.id));
    const teams = teamMemberships
      .filter(tm => wsTeamIdSet.has(tm.team.id))
      .map(tm => ({
        id: tm.team.id,
        name: tm.team.name,
        isLeader: tm.team.leaderId === userId,
      }));

    // Projects — three sources merged, sorted by priority, capped at 2:
    //  1. Explicit ProjectMember rows (any project in this workspace)
    //  2. Team-based access — projects owned by user's teams
    //  3. If user is OWNER/ADMIN/MANAGER, they can access ALL workspace projects
    const STATUS_PRIORITY: Record<string, number> = {
      ACTIVE: 0, PLANNED: 1, PAUSED: 2, COMPLETED: 3, CANCELLED: 4,
    };

    const [projectMemberships, teamProjects, allWsProjects] = await Promise.all([
      // 1. Explicit membership (covers both team-owned and standalone projects)
      prisma.projectMember.findMany({
        where: { userId, project: { workspaceId, deletedAt: null } },
        select: {
          role: true,
          project: { select: { id: true, name: true, identifier: true, status: true, updatedAt: true } },
        },
      }),
      // 2. Projects owned by the user's teams (team membership = implicit access)
      teams.length > 0
        ? prisma.project.findMany({
            where: { workspaceId, deletedAt: null, teamId: { in: teams.map(t => t.id) } },
            select: { id: true, name: true, identifier: true, status: true, updatedAt: true },
          })
        : Promise.resolve([]),
      // 3. All workspace projects for OWNER / ADMIN / MANAGER (they see everything)
      ['OWNER', 'ADMIN', 'MANAGER'].includes(wsMember.role)
        ? prisma.project.findMany({
            where: { workspaceId, deletedAt: null },
            select: { id: true, name: true, identifier: true, status: true, updatedAt: true },
          })
        : Promise.resolve([]),
    ]);

    // Merge into a Map keyed by project id — explicit membership wins for role label
    const projectMap = new Map<string, {
      id: string; name: string; identifier: string;
      status: string; role: string; updatedAt: Date;
    }>();

    for (const p of allWsProjects) {
      projectMap.set(p.id, { ...p, role: 'MEMBER' });
    }
    for (const p of teamProjects) {
      projectMap.set(p.id, { ...p, role: 'MEMBER' });
    }
    for (const pm of projectMemberships) {
      projectMap.set(pm.project.id, { ...pm.project, role: pm.role });
    }

    // Sort: ACTIVE first, then PLANNED, then rest — within same status sort by most recently updated
    const allProjectsSorted = Array.from(projectMap.values())
      .sort((a, b) => {
        const sd = (STATUS_PRIORITY[a.status] ?? 5) - (STATUS_PRIORITY[b.status] ?? 5);
        if (sd !== 0) return sd;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

    const totalProjects = allProjectsSorted.length;
    const projects = allProjectsSorted
      .slice(0, 2)  // show top 2
      .map(({ updatedAt: _u, ...rest }) => rest); // strip internal field before sending

    // Assigned tasks — active only (not DONE / CANCELLED), capped at 5 for the card
    const assignedTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        assigneeId: userId,
        deletedAt: null,
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      select: { id: true, identifier: true, title: true, status: true, priority: true, dueDate: true, projectId: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Task count by status (all, including DONE/CANCELLED)
    const taskCountsByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { workspaceId, assigneeId: userId, deletedAt: null },
      _count: { _all: true },
    });
    const taskCounts = taskCountsByStatus.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    return reply.send({
      user: {
        id: wsMember.user.id,
        name: wsMember.user.name,
        email: wsMember.user.email,
        avatarUrl: wsMember.user.avatarUrl,
      },
      workspaceRole: wsMember.role,
      joinedAt: wsMember.createdAt.toISOString(),
      teams,
      projects,
      totalProjects,
      assignedTasks: assignedTasks.map(t => ({
        id: t.id,
        identifier: t.identifier,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() ?? null,
        projectId: t.projectId,
      })),
      taskCounts,
    });
  });

  // ── POST /:workspaceId/invitations ────────────────────────────────────────
  fastify.post('/:workspaceId/invitations', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners or Admins can invite members' } });
    }

    const parseResult = inviteSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid invite details' } });
    }

    const { role } = parseResult.data;
    const email = parseResult.data.email;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await getWorkspaceMembership(workspaceId, existingUser.id);
      if (existingMember) {
        return reply.status(409).send({ error: { code: 'CONFLICT', message: 'This user is already a member of the workspace' } });
      }
    }

    const now = new Date();
    const existingInvite = await prisma.invitation.findFirst({
      where: { workspaceId, email, acceptedAt: null, expiresAt: { gt: now } },
    });
    if (existingInvite) {
      return reply.status(409).send({ error: { code: 'CONFLICT', message: `A pending invitation for ${email} already exists` } });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: { workspaceId, email, role, token, expiresAt },
    });

    return reply.status(201).send({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });
  });

  // ── GET /:workspaceId/invitations ─────────────────────────────────────────
  fastify.get('/:workspaceId/invitations', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners or Admins can view invitations' } });
    }
    const now = new Date();
    const invitations = await prisma.invitation.findMany({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(invitations);
  });

  // ── DELETE /:workspaceId/invitations/:invitationId ────────────────────────
  fastify.delete('/:workspaceId/invitations/:invitationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, invitationId } = request.params as { workspaceId: string; invitationId: string };
    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners or Admins can revoke invitations' } });
    }
    const invitation = await prisma.invitation.findFirst({ where: { id: invitationId, workspaceId } });
    if (!invitation) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Invitation not found' } });
    await prisma.invitation.delete({ where: { id: invitationId } });
    return reply.status(204).send();
  });

  // ── PATCH /:workspaceId/members/:userId (Change role) ─────────────────────
  fastify.patch('/:workspaceId/members/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, userId } = request.params as { workspaceId: string; userId: string };

    const callerMembership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!callerMembership || (callerMembership.role !== 'OWNER' && callerMembership.role !== 'ADMIN')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners or Admins can change member roles' } });
    }

    const parseResult = updateMemberRoleSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid role value' } });

    const { role } = parseResult.data;

    const targetMembership = await getWorkspaceMembership(workspaceId, userId);
    if (!targetMembership) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Member not found in this workspace' } });
    if (targetMembership.role === 'OWNER') return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'The workspace Owner role cannot be changed' } });
    if (callerMembership.role === 'ADMIN' && role === 'ADMIN') return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admins cannot assign the Admin role to others' } });

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'MEMBER', entityId: userId,
      entityTitle: updated.user.name,
      action: 'UPDATED',
      meta: { from: targetMembership.role, to: role },
    });

    // ── Notification: tell the member their role changed ───────────────────
    await NotificationService.send({
      recipientId:  userId,
      workspaceId,
      type:         'MEMBER_ROLE_CHANGED',
      title:        `Your role in this workspace was changed to ${role}`,
      entityType:   'WORKSPACE',
      entityId:     workspaceId,
      actorId:      request.user!.id,
      actorName:    updated.user.name,
    });

    return reply.send(updated);
  });

  // ── DELETE /:workspaceId/members/:userId (Remove member) ──────────────────
  fastify.delete('/:workspaceId/members/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, userId } = request.params as { workspaceId: string; userId: string };

    const callerMembership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!callerMembership || (callerMembership.role !== 'OWNER' && callerMembership.role !== 'ADMIN')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners or Admins can remove members' } });
    }
    if (userId === request.user!.id) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'You cannot remove yourself. Use the leave workspace action instead' } });
    }

    const targetMembership = await getWorkspaceMembership(workspaceId, userId);
    if (!targetMembership) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Member not found in this workspace' } });
    if (targetMembership.role === 'OWNER') return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'The workspace Owner cannot be removed' } });

    // Fetch user name before deleting the record
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId } } });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'MEMBER', entityId: userId,
      entityTitle: targetUser?.name ?? userId,
      action: 'DELETED',
    });

    return reply.status(204).send();
  });

  // ── GET /:workspaceId/teams ───────────────────────────────────────────────
  fastify.get('/:workspaceId/teams', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'You are not a member of this workspace' } });

    const teams = await prisma.team.findMany({
      where: { workspaceId },
      include: {
        leader:  { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count:  { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(teams);
  });

  // ── POST /:workspaceId/teams ──────────────────────────────────────────────
  fastify.post('/:workspaceId/teams', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership || !['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners, Admins, or Managers can create teams' } });
    }

    const parseResult = createTeamSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid team details' } });

    const { name, description, leaderId } = parseResult.data;

    const team = await prisma.team.create({
      data: {
        workspaceId, name,
        description: description ?? null,
        leaderId: leaderId ?? null,
        ...(leaderId && { members: { create: { userId: leaderId } } }),
      },
      include: {
        leader:  { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count:  { select: { members: true, projects: true } },
      },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'TEAM', entityId: team.id,
      entityTitle: team.name,
      action: 'CREATED',
    });

    return reply.status(201).send(team);
  });

  // ── PATCH /:workspaceId/teams/:teamId ─────────────────────────────────────
  fastify.patch('/:workspaceId/teams/:teamId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, teamId } = request.params as { workspaceId: string; teamId: string };

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const existingTeam = await prisma.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!existingTeam) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Team not found' } });

    const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role);
    const isLeader  = existingTeam.leaderId === request.user!.id;
    if (!isManager && !isLeader) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace managers or the team leader can modify team settings' } });
    }

    const parseResult = updateTeamSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid team update details' } });

    const { name, description, leaderId } = parseResult.data;

    if (leaderId) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId, userId: leaderId } },
        update: {},
        create: { teamId, userId: leaderId },
      });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description: description ?? null }),
        ...(leaderId    !== undefined && { leaderId: leaderId ?? null }),
      },
      include: {
        leader:  { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count:  { select: { members: true, projects: true } },
      },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'TEAM', entityId: teamId,
      entityTitle: updatedTeam.name,
      action: 'UPDATED',
      meta: {
        fields: (['name', 'description', 'leaderId'] as const).filter((f) => parseResult.data[f] !== undefined),
      },
    });

    return reply.send(updatedTeam);
  });

  // ── DELETE /:workspaceId/teams/:teamId ────────────────────────────────────
  fastify.delete('/:workspaceId/teams/:teamId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, teamId } = request.params as { workspaceId: string; teamId: string };

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership || !['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners, Admins, or Managers can delete teams' } });
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, workspaceId }, select: { name: true } });

    await prisma.team.delete({ where: { id: teamId } });

    if (team) {
      // ── Audit ────────────────────────────────────────────────────────────
      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'TEAM', entityId: teamId,
        entityTitle: team.name,
        action: 'DELETED',
      });
    }

    return reply.status(204).send();
  });

  // ── POST /:workspaceId/teams/:teamId/members ──────────────────────────────
  fastify.post('/:workspaceId/teams/:teamId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, teamId } = request.params as { workspaceId: string; teamId: string };

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const team = await prisma.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!team) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Team not found' } });

    const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role);
    const isLeader  = team.leaderId === request.user!.id;
    if (!isManager && !isLeader) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace managers or team leader can add team members' } });
    }

    const parseResult = addTeamMemberSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'userId is required' } });

    const { userId } = parseResult.data;

    const targetMember = await getWorkspaceMembership(workspaceId, userId);
    if (!targetMember) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'User is not a member of this workspace' } });

    const teamMember = await prisma.teamMember.upsert({
      where:   { teamId_userId: { teamId, userId } },
      update:  {},
      create:  { teamId, userId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'TEAM', entityId: teamId,
      entityTitle: team.name,
      action: 'UPDATED',
      meta: { memberAdded: teamMember.user.name, memberId: userId },
    });

    // ── Notification: tell the added member ────────────────────────────────
    const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } });
    await NotificationService.send({
      recipientId:  userId,
      workspaceId,
      type:         'TEAM_MEMBER_ADDED',
      title:        `${actor?.name ?? 'Someone'} added you to team "${team.name}"`,
      entityType:   'TEAM',
      entityId:     teamId,
      entityTitle:  team.name,
      actorId:      request.user!.id,
      actorName:    actor?.name ?? null,
    });

    return reply.status(201).send(teamMember);
  });

  // ── DELETE /:workspaceId/teams/:teamId/members/:userId ────────────────────
  fastify.delete('/:workspaceId/teams/:teamId/members/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, teamId, userId } = request.params as { workspaceId: string; teamId: string; userId: string };

    const membership = await getWorkspaceMembership(workspaceId, request.user!.id);
    if (!membership) return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const team = await prisma.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!team) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Team not found' } });

    const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role);
    const isLeader  = team.leaderId === request.user!.id;
    if (!isManager && !isLeader) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace managers or team leader can remove team members' } });
    }

    // Grab user name before deleting
    const removedUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    await prisma.teamMember.deleteMany({ where: { teamId, userId } });

    if (team.leaderId === userId) {
      await prisma.team.update({ where: { id: teamId }, data: { leaderId: null } });
    }

    // ── Audit ──────────────────────────────────────────────────────────────
    await writeAuditLog({
      workspaceId, actorId: request.user!.id,
      entityType: 'TEAM', entityId: teamId,
      entityTitle: team.name,
      action: 'UPDATED',
      meta: { memberRemoved: removedUser?.name ?? userId, memberId: userId },
    });

    return reply.status(204).send();
  });
}
