import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { chatWsManager, chatWebSocketHandler } from './chat.ws';
import { WsEventType } from '@realm/types';
import { dispatchMentionNotifications } from '../../core/notifications/mention.service';

// ── Validation Schemas ────────────────────────────────────────────────────────

const createCustomChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.object({
    url: z.string(),
    filename: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  parentId: z.string().uuid().optional(),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(50),
});

const setAdminSchema = z.object({
  userId: z.string().uuid(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the ChannelMember row for the given user+channel, or null. */
const getChannelMember = async (channelId: string, userId: string) =>
  prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });

/** Returns the WorkspaceMember row for the given user+workspace, or null. */
const getWorkspaceMember = async (workspaceId: string, userId: string) =>
  prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

/**
 * Resolve the effective channel-level role for a user.
 *
 * Rules (in priority order):
 *  1. Workspace OWNER / ADMIN  → channel role = "ADMIN"
 *  2. Team channel + user is team leader → channel role = "LEADER"  (also treated as admin)
 *  3. Stored ChannelMember.role ("ADMIN" | "LEADER" | "MEMBER")
 *  4. No membership row → "MEMBER" (workspace members can view GENERAL/TEAM/PROJECT channels)
 */
async function resolveChannelRole(
  userId: string,
  workspaceId: string,
  channelId: string,
  channelType: string,
  teamLeaderId?: string | null,
): Promise<'ADMIN' | 'LEADER' | 'MEMBER'> {
  const wsMember = await getWorkspaceMember(workspaceId, userId);
  if (wsMember && ['OWNER', 'ADMIN'].includes(wsMember.role)) return 'ADMIN';

  if (channelType === 'TEAM' && teamLeaderId && teamLeaderId === userId) return 'LEADER';

  const chanMember = await getChannelMember(channelId, userId);
  if (chanMember) {
    const r = chanMember.role.toUpperCase();
    if (r === 'ADMIN') return 'ADMIN';
    if (r === 'LEADER') return 'LEADER';
  }
  return 'MEMBER';
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function chatRoutes(fastify: FastifyInstance) {
  // Register WebSocket route endpoint (authenticated internally via query token in handler)
  fastify.get('/ws', { websocket: true }, chatWebSocketHandler);

  // Authenticate all REST endpoints (skip WS upgrade path)
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.includes('/ws')) return;
    await fastify.authenticate(request, reply);
  });

  // ── GET /:workspaceId/channels ─────────────────────────────────────────────
  // List all channels the requesting user can access.
  // Each channel includes `currentUserRole` so the frontend can gate UI controls.
  fastify.get('/:workspaceId/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(membership.role);

    // Fetch all non-archived channels with everything needed to compute visibility and roles
    const channels = await prisma.channel.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            leaderId: true,
            members: { select: { userId: true } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            identifier: true,
            members: { select: { userId: true } },
          },
        },
        members: { select: { userId: true, role: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Auto-provision the #general channel for workspace if missing
    if (!channels.find(c => c.type === 'GENERAL') && isAdminOrOwner) {
      const created = await prisma.channel.create({
        data: {
          workspaceId,
          createdById: userId,
          name: 'general',
          description: 'Workspace-wide general announcements and discussion',
          type: 'GENERAL',
        },
        include: {
          team: { select: { id: true, name: true, leaderId: true, members: { select: { userId: true } } } },
          project: { select: { id: true, name: true, identifier: true, members: { select: { userId: true } } } },
          members: { select: { userId: true, role: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
          _count: { select: { members: true } },
        },
      });
      channels.unshift(created as any);
    }

    // Filter to channels the user can actually see
    const visibleChannels = channels.filter((channel) => {
      if (isAdminOrOwner) return true;
      if (channel.type === 'GENERAL') return true;
      if (channel.type === 'TEAM' && channel.team) {
        return channel.team.members.some(m => m.userId === userId) || channel.team.leaderId === userId;
      }
      if (channel.type === 'PROJECT' && channel.project) {
        return channel.project.members.some(m => m.userId === userId);
      }
      if (channel.type === 'CUSTOM') {
        return channel.members.some(m => m.userId === userId) || channel.createdById === userId;
      }
      return false;
    });

    // Build the response, computing `currentUserRole` inline (no extra DB round-trips)
    const formatted = visibleChannels.map((c) => {
      // Determine effective channel role without extra queries
      let currentUserRole: 'ADMIN' | 'LEADER' | 'MEMBER' = 'MEMBER';
      if (isAdminOrOwner) {
        currentUserRole = 'ADMIN';
      } else if (c.type === 'TEAM' && c.team?.leaderId === userId) {
        currentUserRole = 'LEADER';
      } else {
        const myMembership = c.members.find(m => m.userId === userId);
        if (myMembership) {
          const r = myMembership.role.toUpperCase();
          if (r === 'ADMIN') currentUserRole = 'ADMIN';
          else if (r === 'LEADER') currentUserRole = 'LEADER';
        }
      }

      return {
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        workspaceId: c.workspaceId,
        createdById: c.createdById,
        teamId: c.teamId,
        projectId: c.projectId,
        name: c.name,
        description: c.description,
        type: c.type,
        isArchived: c.isArchived,
        team: c.team ? { id: c.team.id, name: c.team.name } : null,
        project: c.project ? { id: c.project.id, name: c.project.name, identifier: c.project.identifier } : null,
        membersCount: c._count.members || 1,
        currentUserRole,
        lastMessage: c.messages[0]
          ? {
              id: c.messages[0].id,
              createdAt: c.messages[0].createdAt.toISOString(),
              updatedAt: c.messages[0].updatedAt.toISOString(),
              channelId: c.messages[0].channelId,
              senderId: c.messages[0].senderId,
              content: c.messages[0].content,
              isPinned: c.messages[0].isPinned,
              isEdited: c.messages[0].isEdited,
              sender: c.messages[0].sender,
            }
          : null,
      };
    });

    return reply.send(formatted);
  });

  // ── POST /:workspaceId/channels ────────────────────────────────────────────
  // Create a custom channel. OWNER / ADMIN only.
  fastify.post('/:workspaceId/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace Owners or Admins can create custom channels' } });
    }

    const parseResult = createCustomChannelSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid channel details' } });
    }

    const { name, description } = parseResult.data;
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    const channel = await prisma.channel.create({
      data: {
        workspaceId,
        createdById: userId,
        name: cleanName,
        description: description || null,
        type: 'CUSTOM',
        members: { create: { userId, role: 'ADMIN' } },
      },
      include: {
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, identifier: true } },
      },
    });

    return reply.status(201).send({ ...channel, currentUserRole: 'ADMIN' });
  });

  // ── POST /:workspaceId/teams/:teamId/channel ───────────────────────────────
  // Provision (or return) the team chat channel.
  fastify.post('/:workspaceId/teams/:teamId/channel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, teamId } = request.params as { workspaceId: string; teamId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, workspaceId },
      include: { members: true },
    });
    if (!team) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Team not found' } });
    }

    const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role);
    const isTeamLeader = team.leaderId === userId;
    if (!isManager && !isTeamLeader) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace managers or team leaders can enable team channels' } });
    }

    let channel = await prisma.channel.findFirst({ where: { workspaceId, teamId } });
    if (!channel) {
      const channelName = `team-${team.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;
      channel = await prisma.channel.create({
        data: {
          workspaceId,
          createdById: userId,
          teamId,
          name: channelName,
          description: `Dedicated chat channel for team ${team.name}`,
          type: 'TEAM',
          members: {
            createMany: {
              data: team.members.map(m => ({
                userId: m.userId,
                role: m.userId === team.leaderId ? 'LEADER' : 'MEMBER',
              })),
            },
          },
        },
      });
    }

    return reply.status(200).send(channel);
  });

  // ── POST /:workspaceId/projects/:projectId/channel ─────────────────────────
  // Provision (or return) the project chat channel.
  fastify.post('/:workspaceId/projects/:projectId/channel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: { members: true },
    });
    if (!project) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    let channel = await prisma.channel.findFirst({ where: { workspaceId, projectId } });
    if (!channel) {
      const channelName = `proj-${project.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;
      channel = await prisma.channel.create({
        data: {
          workspaceId,
          createdById: userId,
          projectId,
          name: channelName,
          description: `Project channel for ${project.name} (${project.identifier})`,
          type: 'PROJECT',
          members: {
            createMany: {
              data: project.members.map(m => ({
                userId: m.userId,
                role: m.role === 'LEAD' ? 'LEADER' : 'MEMBER',
              })),
            },
          },
        },
      });
    }

    return reply.status(200).send(channel);
  });

  // ── GET /:workspaceId/channels/:channelId/members ─────────────────────────
  // List members who can participate in a channel, with their effective channel-
  // level role AND their workspace-level role (for role badges in the UI).
  //
  // For each channel type the "member universe" is:
  //   GENERAL  → every workspace member
  //   TEAM     → team members + workspace OWNER/ADMIN
  //   PROJECT  → project members + workspace OWNER/ADMIN
  //   CUSTOM   → ChannelMember rows only
  fastify.get('/:workspaceId/channels/:channelId/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, channelId } = request.params as { workspaceId: string; channelId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      include: {
        team: { select: { id: true, leaderId: true, members: { select: { userId: true } } } },
        project: { select: { id: true, members: { select: { userId: true, role: true } } } },
        members: { select: { userId: true, role: true, lastReadAt: true } },
      },
    });
    if (!channel) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Channel not found' } });
    }

    // ── Build a map of userId → channelMember row (for stored role + lastReadAt) ──
    const channelMemberMap = new Map(
      channel.members.map(m => [m.userId, m]),
    );

    // ── Determine which workspace members to include ──────────────────────────
    let wsMembers: { userId: string; wsRole: string }[] = [];

    if (channel.type === 'GENERAL' || channel.type === 'CUSTOM') {
      // GENERAL: all workspace members; CUSTOM: only stored channel members
      const rows = channel.type === 'GENERAL'
        ? await prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: { userId: true, role: true },
          })
        : await prisma.workspaceMember.findMany({
            where: {
              workspaceId,
              userId: { in: Array.from(channelMemberMap.keys()) },
            },
            select: { userId: true, role: true },
          });
      wsMembers = rows.map(r => ({ userId: r.userId, wsRole: r.role }));
    } else if (channel.type === 'TEAM' && channel.team) {
      const teamUserIds = new Set(channel.team.members.map(m => m.userId));
      const rows = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true, role: true },
      });
      wsMembers = rows
        .filter(r => teamUserIds.has(r.userId) || ['OWNER', 'ADMIN'].includes(r.role))
        .map(r => ({ userId: r.userId, wsRole: r.role }));
    } else if (channel.type === 'PROJECT' && channel.project) {
      const projectUserIds = new Set(channel.project.members.map(m => m.userId));
      const rows = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        select: { userId: true, role: true },
      });
      wsMembers = rows
        .filter(r => projectUserIds.has(r.userId) || ['OWNER', 'ADMIN'].includes(r.role))
        .map(r => ({ userId: r.userId, wsRole: r.role }));
    }

    if (wsMembers.length === 0) return reply.send([]);

    // ── Fetch user profiles in one query ─────────────────────────────────────
    const users = await prisma.user.findMany({
      where: { id: { in: wsMembers.map(m => m.userId) } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    // ── Derive effective channel role ─────────────────────────────────────────
    const resolveRole = (uid: string, wsRole: string): 'ADMIN' | 'LEADER' | 'MEMBER' => {
      if (['OWNER', 'ADMIN'].includes(wsRole)) return 'ADMIN';
      if (channel.type === 'TEAM' && channel.team?.leaderId === uid) return 'LEADER';
      const stored = channelMemberMap.get(uid);
      if (stored) {
        const r = stored.role.toUpperCase();
        if (r === 'ADMIN') return 'ADMIN';
        if (r === 'LEADER') return 'LEADER';
      }
      return 'MEMBER';
    };

    // ── Build response ────────────────────────────────────────────────────────
    const now = new Date().toISOString();

    const result = wsMembers
      .map(({ userId: uid, wsRole }) => {
        const user = userMap.get(uid);
        if (!user) return null;
        const stored = channelMemberMap.get(uid);
        return {
          // Use the stored ChannelMember id when available, otherwise synthesise one
          id:          stored ? `${channelId}_${uid}` : `${channelId}_${uid}`,
          userId:      uid,
          channelId,
          role:        resolveRole(uid, wsRole),
          workspaceRole: wsRole,   // ← extra field consumed by frontend badges
          lastReadAt:  stored ? stored.lastReadAt.toISOString() : now,
          user,
        };
      })
      .filter(Boolean)
      // Sort: OWNER first, then ADMIN, then LEADER, then MEMBER; alphabetical within tier
      .sort((a, b) => {
        const order: Record<string, number> = { OWNER: 0, ADMIN: 1, MANAGER: 2, MEMBER: 3 };
        const wsOrder = (order[a!.workspaceRole] ?? 4) - (order[b!.workspaceRole] ?? 4);
        if (wsOrder !== 0) return wsOrder;
        return a!.user.name.localeCompare(b!.user.name);
      });

    return reply.send(result);
  });

  // ── POST /:workspaceId/channels/:channelId/members/:targetUserId/admin ─────
  // Grant channel-admin role to a member.
  //
  // Who can do this:
  //   • Workspace OWNER / ADMIN  → in ANY channel type
  //   • Team LEADER              → only in their team's TEAM channel
  //   • Channel ADMIN            → in CUSTOM channels they admin
  fastify.post(
    '/:workspaceId/channels/:channelId/members/:targetUserId/admin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, channelId, targetUserId } = request.params as {
        workspaceId: string;
        channelId: string;
        targetUserId: string;
      };
      const actorId = request.user!.id;

      // ── authorisation check ──────────────────────────────────────────────
      const wsMembership = await getWorkspaceMember(workspaceId, actorId);
      if (!wsMembership) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const channel = await prisma.channel.findFirst({
        where: { id: channelId, workspaceId },
        include: { team: { select: { leaderId: true } } },
      });
      if (!channel) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      const isWsAdmin = ['OWNER', 'ADMIN'].includes(wsMembership.role);
      const isTeamLeader = channel.type === 'TEAM' && channel.team?.leaderId === actorId;
      const chanMember = await getChannelMember(channelId, actorId);
      const isChannelAdmin = chanMember?.role === 'ADMIN';

      if (!isWsAdmin && !isTeamLeader && !isChannelAdmin) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Only channel admins or workspace owners/admins can manage channel roles' },
        });
      }

      // ── target must be a member of the channel ───────────────────────────
      const targetMember = await getChannelMember(channelId, targetUserId);
      if (!targetMember) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Target user is not a member of this channel' } });
      }

      const updated = await prisma.channelMember.update({
        where: { id: targetMember.id },
        data: { role: 'ADMIN' },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });

      // Broadcast role change to channel subscribers
      chatWsManager.broadcastToChannel(channelId, {
        event: WsEventType.MEMBER_ROLE_UPDATED,
        channelId,
        data: {
          userId: targetUserId,
          role: 'ADMIN',
          updatedBy: actorId,
        },
      });

      return reply.send({
        id: updated.id,
        userId: updated.userId,
        channelId: updated.channelId,
        role: updated.role,
        lastReadAt: updated.lastReadAt.toISOString(),
        user: updated.user,
      });
    }
  );

  // ── DELETE /:workspaceId/channels/:channelId/members/:targetUserId/admin ───
  // Revoke channel-admin role from a member (demote back to MEMBER).
  //
  // Same permission rules as granting admin.
  fastify.delete(
    '/:workspaceId/channels/:channelId/members/:targetUserId/admin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, channelId, targetUserId } = request.params as {
        workspaceId: string;
        channelId: string;
        targetUserId: string;
      };
      const actorId = request.user!.id;

      const wsMembership = await getWorkspaceMember(workspaceId, actorId);
      if (!wsMembership) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const channel = await prisma.channel.findFirst({
        where: { id: channelId, workspaceId },
        include: { team: { select: { leaderId: true } } },
      });
      if (!channel) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Channel not found' } });
      }

      const isWsAdmin = ['OWNER', 'ADMIN'].includes(wsMembership.role);
      const isTeamLeader = channel.type === 'TEAM' && channel.team?.leaderId === actorId;
      const chanMember = await getChannelMember(channelId, actorId);
      const isChannelAdmin = chanMember?.role === 'ADMIN';

      if (!isWsAdmin && !isTeamLeader && !isChannelAdmin) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Only channel admins or workspace owners/admins can manage channel roles' },
        });
      }

      const targetMember = await getChannelMember(channelId, targetUserId);
      if (!targetMember) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Target user is not a member of this channel' } });
      }

      // Don't allow demoting a workspace OWNER/ADMIN – their admin status is derived, not stored
      const targetWsMembership = await getWorkspaceMember(workspaceId, targetUserId);
      if (targetWsMembership && ['OWNER', 'ADMIN'].includes(targetWsMembership.role)) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Cannot remove admin from a workspace Owner or Admin — their role is workspace-level' },
        });
      }

      // LEADER role is protected in TEAM channels (the team leader's channel role)
      if (targetMember.role === 'LEADER' && channel.type === 'TEAM') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Team leader role in team channels cannot be demoted here. Change the team leader instead.' },
        });
      }

      const updated = await prisma.channelMember.update({
        where: { id: targetMember.id },
        data: { role: 'MEMBER' },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });

      chatWsManager.broadcastToChannel(channelId, {
        event: WsEventType.MEMBER_ROLE_UPDATED,
        channelId,
        data: {
          userId: targetUserId,
          role: 'MEMBER',
          updatedBy: actorId,
        },
      });

      return reply.send({
        id: updated.id,
        userId: updated.userId,
        channelId: updated.channelId,
        role: updated.role,
        lastReadAt: updated.lastReadAt.toISOString(),
        user: updated.user,
      });
    }
  );

  // ── GET /:workspaceId/channels/:channelId/messages ────────────────────────
  // Paginated message history (last 50, oldest-first).
  fastify.get('/:workspaceId/channels/:channelId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, channelId } = request.params as { workspaceId: string; channelId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { channelId },
      take: 50,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      channelId: m.channelId,
      senderId: m.senderId,
      parentId: m.parentId,
      content: m.content,
      attachments: (m.attachments as any) || [],
      isPinned: m.isPinned,
      isEdited: m.isEdited,
      sender: m.sender,
      reactions: m.reactions.map(r => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.userId,
        userName: r.user.name,
      })),
    }));

    return reply.send(formatted);
  });

  // ── POST /:workspaceId/channels/:channelId/messages ───────────────────────
  // HTTP fallback for sending a message (WS is preferred).
  fastify.post('/:workspaceId/channels/:channelId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, channelId } = request.params as { workspaceId: string; channelId: string };
    const userId = request.user!.id;

    const parseResult = sendMessageSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Message content is required' } });
    }

    const { content, attachments, parentId } = parseResult.data;

    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        senderId: userId,
        content,
        attachments: attachments || [],
        parentId: parentId || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    const formattedMsg = {
      id: message.id,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      channelId: message.channelId,
      senderId: message.senderId,
      parentId: message.parentId,
      content: message.content,
      attachments: (message.attachments as any) || [],
      isPinned: message.isPinned,
      isEdited: message.isEdited,
      sender: message.sender,
      reactions: [],
    };

    chatWsManager.broadcastToChannel(channelId, {
      event: WsEventType.NEW_MESSAGE,
      channelId,
      data: formattedMsg,
    });

    if (content.includes('@')) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { name: true },
      });
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await dispatchMentionNotifications({
        content,
        senderId: userId,
        senderName: sender?.name ?? 'Someone',
        channelId,
        workspaceId,
        messageId: message.id,
        channelName: channel?.name,
      });
    }

    return reply.status(201).send(formattedMsg);
  });

  // ── DELETE /:workspaceId/channels/:channelId/messages/:messageId ──────────
  // Delete a message. Author, channel admin/leader, or workspace owner/admin.
  fastify.delete(
    '/:workspaceId/channels/:channelId/messages/:messageId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, channelId, messageId } = request.params as {
        workspaceId: string;
        channelId: string;
        messageId: string;
      };
      const userId = request.user!.id;

      const membership = await getWorkspaceMember(workspaceId, userId);
      if (!membership) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const targetMessage = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: { channel: { include: { team: true } } },
      });
      if (!targetMessage) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
      }

      const isAuthor = targetMessage.senderId === userId;
      const isWsAdmin = ['OWNER', 'ADMIN'].includes(membership.role);
      const isTeamLeader = targetMessage.channel.team?.leaderId === userId;
      const chanMember = await getChannelMember(channelId, userId);
      const isChannelAdmin = chanMember?.role === 'ADMIN';

      if (!isAuthor && !isWsAdmin && !isTeamLeader && !isChannelAdmin) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this message' } });
      }

      await prisma.chatMessage.delete({ where: { id: messageId } });

      chatWsManager.broadcastToChannel(channelId, {
        event: WsEventType.DELETE_MESSAGE,
        channelId,
        data: { messageId },
      });

      return reply.status(204).send();
    }
  );

  // ── POST /:workspaceId/channels/:channelId/messages/:messageId/pin ─────────
  // Toggle pin. Workspace admin/owner, channel admin/leader, or message author.
  fastify.post(
    '/:workspaceId/channels/:channelId/messages/:messageId/pin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, channelId, messageId } = request.params as {
        workspaceId: string;
        channelId: string;
        messageId: string;
      };
      const userId = request.user!.id;

      const membership = await getWorkspaceMember(workspaceId, userId);
      if (!membership) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }

      const targetMessage = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: { channel: { include: { team: true } } },
      });
      if (!targetMessage) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
      }

      const isAuthor = targetMessage.senderId === userId;
      const isWsAdmin = ['OWNER', 'ADMIN'].includes(membership.role);
      const isTeamLeader = targetMessage.channel.team?.leaderId === userId;
      const chanMember = await getChannelMember(channelId, userId);
      const isChannelAdmin = chanMember?.role === 'ADMIN';

      if (!isAuthor && !isWsAdmin && !isTeamLeader && !isChannelAdmin) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'You do not have permission to pin messages in this channel' } });
      }

      const updated = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isPinned: !targetMessage.isPinned },
      });

      chatWsManager.broadcastToChannel(channelId, {
        event: WsEventType.PIN_TOGGLE,
        channelId,
        data: { messageId, isPinned: updated.isPinned },
      });

      return reply.send({ id: updated.id, isPinned: updated.isPinned });
    }
  );

  // ── POST /:workspaceId/channels/:channelId/messages/:messageId/reactions ───
  // Toggle an emoji reaction.
  fastify.post(
    '/:workspaceId/channels/:channelId/messages/:messageId/reactions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { channelId, messageId } = request.params as { channelId: string; messageId: string };
      const userId = request.user!.id;

      const parseResult = reactionSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Emoji is required' } });
      }

      const { emoji } = parseResult.data;

      const existing = await prisma.messageReaction.findUnique({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
      });

      if (existing) {
        await prisma.messageReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
      }

      const reactions = await prisma.messageReaction.findMany({
        where: { messageId },
        include: { user: { select: { id: true, name: true } } },
      });

      const formatted = reactions.map(r => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.userId,
        userName: r.user.name,
      }));

      chatWsManager.broadcastToChannel(channelId, {
        event: WsEventType.REACTION_TOGGLE,
        channelId,
        data: { messageId, reactions: formatted },
      });

      return reply.send(formatted);
    }
  );
}
