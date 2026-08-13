import { FastifyInstance, FastifyRequest } from 'fastify';
import { SessionService } from '../../core/auth/session.service';
import { prisma } from '../../infrastructure/database/prisma';
import { WsEventType, WsMessagePayload } from '@realm/types';
import { dispatchMentionNotifications } from '../../core/notifications/mention.service';

interface ConnectedClient {
  socket: any;
  userId: string;
  userName: string;
  userEmail: string;
  workspaceId?: string | undefined;
  subscribedChannels: Set<string>;
}

class ChatWsManager {
  private clients: Map<string, ConnectedClient> = new Map(); // socketId -> Client

  public addClient(socketId: string, client: ConnectedClient) {
    this.clients.set(socketId, client);
  }

  public removeClient(socketId: string) {
    this.clients.delete(socketId);
  }

  public subscribeToChannel(socketId: string, channelId: string) {
    const client = this.clients.get(socketId);
    if (client) {
      client.subscribedChannels.add(channelId);
    }
  }

  public unsubscribeFromChannel(socketId: string, channelId: string) {
    const client = this.clients.get(socketId);
    if (client) {
      client.subscribedChannels.delete(channelId);
    }
  }

  public broadcastToChannel(channelId: string, payload: WsMessagePayload, excludeSocketId?: string) {
    const messageStr = JSON.stringify(payload);
    for (const [sId, client] of this.clients.entries()) {
      if (sId === excludeSocketId) continue;
      if (client.subscribedChannels.has(channelId)) {
        if (client.socket.readyState === 1) { // OPEN
          client.socket.send(messageStr);
        }
      }
    }
  }
}

export const chatWsManager = new ChatWsManager();

export async function chatWebSocketHandler(connection: any, request: FastifyRequest) {
  const socket = connection.socket || connection;
  const socketId = Math.random().toString(36).substring(2, 15);

  // Extract session token from query string e.g. /api/v1/chat/ws?token=xyz
  const query = request.query as { token?: string; workspaceId?: string };
  const token = query.token || null;

  if (!token) {
    socket.send(JSON.stringify({ event: WsEventType.ERROR, data: { message: 'Authentication required' } }));
    socket.close();
    return;
  }

  const session = await SessionService.validateSession(token);
  if (!session || !session.user) {
    socket.send(JSON.stringify({ event: WsEventType.ERROR, data: { message: 'Invalid or expired session' } }));
    socket.close();
    return;
  }

  const user = session.user;
  const client: ConnectedClient = {
    socket,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    workspaceId: query.workspaceId,
    subscribedChannels: new Set<string>(),
  };

  chatWsManager.addClient(socketId, client);

  // Send connected welcome event
  socket.send(JSON.stringify({
    event: WsEventType.PRESENCE,
    data: { status: 'connected', userId: user.id, name: user.name }
  }));

  socket.on('message', async (rawMessage: Buffer | string) => {
    try {
      const payload: WsMessagePayload = JSON.parse(rawMessage.toString());
      const { event, channelId, data } = payload;

      if (!channelId) return;

      // Handle subscription
      if (event === WsEventType.SUBSCRIBE) {
        // Verify channel membership/permissions before subscribing
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          include: {
            team: { include: { members: true } },
            project: { include: { members: true } },
          }
        });

        if (channel) {
          chatWsManager.subscribeToChannel(socketId, channelId);
          socket.send(JSON.stringify({
            event: WsEventType.SUBSCRIBE,
            channelId,
            data: { status: 'subscribed' }
          }));
        }
        return;
      }

      if (event === WsEventType.UNSUBSCRIBE) {
        chatWsManager.unsubscribeFromChannel(socketId, channelId);
        return;
      }

      // Handle typing indicators
      if (event === WsEventType.TYPING_START || event === WsEventType.TYPING_STOP) {
        chatWsManager.broadcastToChannel(channelId, {
          event,
          channelId,
          data: { userId: user.id, userName: user.name }
        }, socketId);
        return;
      }

      // Handle new chat message
      if (event === WsEventType.NEW_MESSAGE && data?.content) {
        const newMessage = await prisma.chatMessage.create({
          data: {
            channelId,
            senderId: user.id,
            content: data.content,
            attachments: data.attachments || [],
            parentId: data.parentId || null,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true, avatarUrl: true }
            },
            reactions: {
              include: { user: { select: { id: true, name: true } } }
            }
          }
        });

        const formattedMsg = {
          id: newMessage.id,
          createdAt: newMessage.createdAt.toISOString(),
          updatedAt: newMessage.updatedAt.toISOString(),
          channelId: newMessage.channelId,
          senderId: newMessage.senderId,
          parentId: newMessage.parentId,
          content: newMessage.content,
          attachments: (newMessage.attachments as any) || [],
          isPinned: newMessage.isPinned,
          isEdited: newMessage.isEdited,
          sender: newMessage.sender,
          reactions: newMessage.reactions.map(r => ({
            id: r.id,
            emoji: r.emoji,
            userId: r.userId,
            userName: r.user.name
          })),
        };

        // Broadcast to channel subscribers (including sender for acknowledgment)
        chatWsManager.broadcastToChannel(channelId, {
          event: WsEventType.NEW_MESSAGE,
          channelId,
          data: formattedMsg
        });

        // ── @mention notifications ─────────────────────────────────────────
        // Fetch channel name once for the notification title, then dispatch.
        // Fire-and-forget — errors inside are caught by dispatchMentionNotifications.
        if (data.content.includes('@') && client.workspaceId) {
          const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { name: true, workspaceId: true },
          });
          await dispatchMentionNotifications({
            content:     data.content,
            senderId:    user.id,
            senderName:  user.name,
            channelId,
            workspaceId: channel?.workspaceId ?? client.workspaceId,
            messageId:   newMessage.id,
            channelName: channel?.name,
          });
        }
      }

    } catch (err) {
      socket.send(JSON.stringify({ event: WsEventType.ERROR, data: { message: 'Invalid payload format' } }));
    }
  });

  socket.on('close', () => {
    chatWsManager.removeClient(socketId);
  });
}
