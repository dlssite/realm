/**
 * notification.service.ts
 *
 * Single source of truth for all notification logic.
 *
 * Responsibilities:
 *  1. Write a notification to the DB (send)
 *  2. Deliver it in real-time to any open SSE connections for that user
 *  3. REST helpers: list, unread-count, mark-read, mark-all-read, delete
 *
 * Transport is intentionally isolated behind the SSE registry so that
 * adding a second transport (e.g. WebSocket, push, email) means only
 * touching this file — callers don't change.
 *
 * Usage from any route/service:
 *   import { NotificationService } from '../../core/notifications/notification.service';
 *
 *   await NotificationService.send({
 *     recipientId: assigneeId,
 *     workspaceId,
 *     type: 'TASK_ASSIGNED',
 *     title: `${actorName} assigned you "${taskTitle}"`,
 *     entityType: 'TASK',
 *     entityId: taskId,
 *     entityTitle: taskTitle,
 *     actorId,
 *     actorName,
 *   });
 */

import { prisma } from '../../infrastructure/database/prisma';
import { NotificationType } from '@prisma/client';
import type { ServerResponse } from 'node:http';

// ── SSE Connection Registry ───────────────────────────────────────────────────
// Maps userId → set of active SSE response streams.
// Multiple browser tabs for the same user each get their own entry.

class SseRegistry {
  private connections = new Map<string, Set<ServerResponse>>();

  add(userId: string, res: ServerResponse) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(res);
  }

  remove(userId: string, res: ServerResponse) {
    this.connections.get(userId)?.delete(res);
    if (this.connections.get(userId)?.size === 0) {
      this.connections.delete(userId);
    }
  }

  /** Push a raw SSE event string to all open connections for a user. */
  push(userId: string, eventName: string, data: unknown) {
    const conns = this.connections.get(userId);
    if (!conns || conns.size === 0) return;

    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of conns) {
      try {
        res.write(payload);
      } catch {
        // Connection closed between check and write — remove it silently
        conns.delete(res);
      }
    }
  }

  isConnected(userId: string) {
    return (this.connections.get(userId)?.size ?? 0) > 0;
  }
}

export const sseRegistry = new SseRegistry();

// ── Input type ────────────────────────────────────────────────────────────────

export interface SendNotificationInput {
  recipientId:  string;
  workspaceId?: string | null | undefined;
  type:         NotificationType;
  title:        string;
  body?:        string | undefined;
  entityType:   string;
  entityId:     string;
  entityTitle?: string | null | undefined;
  actorId?:     string | null | undefined;
  actorName?:   string | null | undefined;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const NotificationService = {

  /**
   * Persist a notification then push it over SSE if the recipient is online.
   * Fire-and-forget safe — errors are caught and logged so callers are never disrupted.
   */
  async send(input: SendNotificationInput): Promise<void> {
    try {
      // Don't notify yourself
      if (input.actorId && input.actorId === input.recipientId) return;

      const notification = await prisma.notification.create({
        data: {
          recipientId:  input.recipientId,
          workspaceId:  input.workspaceId  ?? null,
          type:         input.type,
          title:        input.title,
          body:         input.body         ?? null,
          entityType:   input.entityType,
          entityId:     input.entityId,
          entityTitle:  input.entityTitle  ?? null,
          actorId:      input.actorId      ?? null,
          actorName:    input.actorName    ?? null,
        },
      });

      // Real-time delivery — silently skipped if no open SSE connection
      sseRegistry.push(input.recipientId, 'notification', {
        id:          notification.id,
        createdAt:   notification.createdAt,
        type:        notification.type,
        title:       notification.title,
        body:        notification.body,
        entityType:  notification.entityType,
        entityId:    notification.entityId,
        entityTitle: notification.entityTitle,
        actorId:     notification.actorId,
        actorName:   notification.actorName,
        isRead:      false,
      });
    } catch (err) {
      console.error('[notifications] Failed to send notification:', err);
    }
  },

  /** Paginated list of notifications for a user, newest first. */
  async list(recipientId: string, opts: { unreadOnly?: boolean | undefined; limit?: number | undefined; cursor?: string | undefined }) {
    const limit = Math.min(opts.limit ?? 30, 100);
    const items = await prisma.notification.findMany({
      where: {
        recipientId,
        ...(opts.unreadOnly && { isRead: false }),
        ...(opts.cursor && { createdAt: { lt: new Date(opts.cursor) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasNextPage = items.length > limit;
    const page = hasNextPage ? items.slice(0, limit) : items;
    return {
      items: page,
      nextCursor: hasNextPage ? page[page.length - 1]!.createdAt.toISOString() : null,
      hasNextPage,
    };
  },

  /** Count of unread notifications. */
  async unreadCount(recipientId: string): Promise<number> {
    return prisma.notification.count({ where: { recipientId, isRead: false } });
  },

  /** Mark a single notification as read. Returns null if not found / wrong owner. */
  async markRead(notificationId: string, recipientId: string) {
    const n = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId },
    });
    if (!n) return null;
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  /** Mark every unread notification for a user as read. */
  async markAllRead(recipientId: string): Promise<number> {
    const { count } = await prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return count;
  },

  /** Soft-delete a notification (hard delete — they're cheap to recreate). */
  async remove(notificationId: string, recipientId: string): Promise<boolean> {
    const n = await prisma.notification.findFirst({ where: { id: notificationId, recipientId } });
    if (!n) return false;
    await prisma.notification.delete({ where: { id: notificationId } });
    return true;
  },

  /** Clear all read notifications older than N days (housekeeping). */
  async purgeRead(recipientId: string, olderThanDays = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const { count } = await prisma.notification.deleteMany({
      where: { recipientId, isRead: true, createdAt: { lt: cutoff } },
    });
    return count;
  },
};
