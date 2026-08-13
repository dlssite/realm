import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { chatWsManager, chatWebSocketHandler } from './chat.ws';
import { WsEventType } from '@realm/types';
import { dispatchMentionNotifications } from '../../core/notifications/mention.service';

// Validation Schemas
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

export async function chatRoutes(fastify: FastifyInstance) {
  // Register WebSocket route endpoint (authenticated internally via query token in handler)
  fastify.get('/ws', { websocket: true }, chatWebSocketHandler);

  // Authenticate REST endpoints (skip WS upgrade route)
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url.includes('/ws')) return;
    await fastify.authenticate(request, reply);
  });

  // Helper to check user's membership and role in workspace
  const getWorkspaceMember = async (workspaceId: string, userId: string) => {
    return prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  };

  // GET /api/v1/workspaces/:workspaceId/channels (List user accessible channels)
  fastify.get('/:workspaceId/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    const isAdminOrOwner = ['OWNER', 'ADMIN'].includes(membership.role);

    // Fetch all channels in workspace
    const channels = await prisma.channel.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        team: { select: { id: true, name: true, leaderId: true, members: { select: { userId: true } } } },
        project: { select: { id: true, name: true, identifier: true, members: { select: { userId: true } } } },
        members: { select: { userId: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
        },
        _count: { select: { members: true, messages: true } }
      },
      orderBy: { createdAt: 'asc' },
    });

    // Ensure general channel exists for workspace
    let generalChannel = channels.find(c => c.type === 'GENERAL');
    if (!generalChannel && isAdminOrOwner) {
      const createdGeneral = await prisma.channel.create({
        data: {
          workspaceId,
          createdById: userId,
          name: 'general',
          description: 'Workspace-wide general announcements and discussion',
          type: 'GENERAL',
        },
        include: {
          team: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, identifier: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, name: true, avatarUrl: true } } } },
          _count: { select: { members: true, messages: true } }
        }
      });
      channels.unshift(createdGeneral as any);
    }

    // Filter channels based on visibility rules
    const visibleChannels = channels.filter((channel) => {
      if (isAdminOrOwner) return true; // Admins and Owners see ALL channels
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

    const formatted = visibleChannels.map((c) => ({
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
      lastMessage: c.messages[0] ? {
        id: c.messages[0].id,
        createdAt: c.messages[0].createdAt.toISOString(),
        updatedAt: c.messages[0].updatedAt.toISOString(),
        channelId: c.messages[0].channelId,
        senderId: c.messages[0].senderId,
        content: c.messages[0].content,
        isPinned: c.messages[0].isPinned,
        isEdited: c.messages[0].isEdited,
        sender: c.messages[0].sender
      } : null,
    }));

    return reply.send(formatted);
  });

  // POST /api/v1/workspaces/:workspaceId/channels (Create Custom Channel - OWNER/ADMIN only)
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
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
      include: {
        team: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, identifier: true } },
      }
    });

    return reply.status(201).send(channel);
  });

  // POST /api/v1/workspaces/:workspaceId/teams/:teamId/channel (Provision Team Channel)
  fastify.post('/:workspaceId/teams/:teamId/channel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, teamId } = request.params as { workspaceId: string; teamId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, workspaceId },
      include: { members: true }
    });

    if (!team) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Team not found' } });
    }

    const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(membership.role);
    const isTeamLeader = team.leaderId === userId;

    if (!isManager && !isTeamLeader) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only workspace managers or team leaders can enable team channels' } });
    }

    let channel = await prisma.channel.findFirst({
      where: { workspaceId, teamId }
    });

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
              data: team.members.map(m => ({ userId: m.userId, role: m.userId === team.leaderId ? 'LEADER' : 'MEMBER' }))
            }
          }
        }
      });
    }

    return reply.status(200).send(channel);
  });

  // POST /api/v1/workspaces/:workspaceId/projects/:projectId/channel (Provision Project Channel)
  fastify.post('/:workspaceId/projects/:projectId/channel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, projectId } = request.params as { workspaceId: string; projectId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this workspace' } });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: { members: true }
    });

    if (!project) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Project not found' } });
    }

    let channel = await prisma.channel.findFirst({
      where: { workspaceId, projectId }
    });

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
              data: project.members.map(m => ({ userId: m.userId, role: m.role === 'LEAD' ? 'LEADER' : 'MEMBER' }))
            }
          }
        }
      });
    }

    return reply.status(200).send(channel);
  });

  // GET /api/v1/workspaces/:workspaceId/channels/:channelId/messages (Paginated Messages)
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
        reactions: { include: { user: { select: { id: true, name: true } } } }
      }
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
        userName: r.user.name
      }))
    }));

    return reply.send(formatted);
  });

  // POST /api/v1/workspaces/:workspaceId/channels/:channelId/messages (HTTP fallback)
  fastify.post('/:workspaceId/channels/:channelId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { channelId } = request.params as { channelId: string };
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
        reactions: { include: { user: { select: { id: true, name: true } } } }
      }
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
      reactions: []
    };

    // Broadcast over WebSocket
    chatWsManager.broadcastToChannel(channelId, {
      event: WsEventType.NEW_MESSAGE,
      channelId,
      data: formattedMsg
    });

    // ── @mention notifications ───────────────────────────────────────────────
    if (content.includes('@')) {
      const { workspaceId } = request.params as { workspaceId: string };
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
        senderId:    userId,
        senderName:  sender?.name ?? 'Someone',
        channelId,
        workspaceId,
        messageId:   message.id,
        channelName: channel?.name,
      });
    }

    return reply.status(201).send(formattedMsg);
  });

  // DELETE /api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId
  fastify.delete('/:workspaceId/channels/:channelId/messages/:messageId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, channelId, messageId } = request.params as { workspaceId: string; channelId: string; messageId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const targetMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { channel: { include: { team: true } } }
    });

    if (!targetMessage) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    const isAuthor = targetMessage.senderId === userId;
    const isAdmin = ['OWNER', 'ADMIN'].includes(membership.role);
    const isTeamLeader = targetMessage.channel.team?.leaderId === userId;

    if (!isAuthor && !isAdmin && !isTeamLeader) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this message' } });
    }

    await prisma.chatMessage.delete({ where: { id: messageId } });

    chatWsManager.broadcastToChannel(channelId, {
      event: WsEventType.DELETE_MESSAGE,
      channelId,
      data: { messageId }
    });

    return reply.status(204).send();
  });

  // POST /api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/pin
  fastify.post('/:workspaceId/channels/:channelId/messages/:messageId/pin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, channelId, messageId } = request.params as { workspaceId: string; channelId: string; messageId: string };
    const userId = request.user!.id;

    const membership = await getWorkspaceMember(workspaceId, userId);
    if (!membership) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
    }

    const targetMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { channel: { include: { team: true } } }
    });

    if (!targetMessage) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isPinned: !targetMessage.isPinned }
    });

    chatWsManager.broadcastToChannel(channelId, {
      event: WsEventType.PIN_TOGGLE,
      channelId,
      data: { messageId, isPinned: updated.isPinned }
    });

    return reply.send({ id: updated.id, isPinned: updated.isPinned });
  });

  // POST /api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/reactions
  fastify.post('/:workspaceId/channels/:channelId/messages/:messageId/reactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { channelId, messageId } = request.params as { channelId: string; messageId: string };
    const userId = request.user!.id;

    const parseResult = reactionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Emoji is required' } });
    }

    const { emoji } = parseResult.data;

    const existingReaction = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } }
    });

    if (existingReaction) {
      await prisma.messageReaction.delete({ where: { id: existingReaction.id } });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId, emoji }
      });
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, name: true } } }
    });

    const formattedReactions = reactions.map(r => ({
      id: r.id,
      emoji: r.emoji,
      userId: r.userId,
      userName: r.user.name
    }));

    chatWsManager.broadcastToChannel(channelId, {
      event: WsEventType.REACTION_TOGGLE,
      channelId,
      data: { messageId, reactions: formattedReactions }
    });

    return reply.send(formattedReactions);
  });
}
