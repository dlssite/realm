/**
 * audit.service.ts
 *
 * Thin helper that writes an immutable entry to the audit_logs table.
 * Always fire-and-forget — if the write fails it is logged to stderr but
 * the calling route handler is NOT affected.
 *
 * Usage:
 *   import { writeAuditLog } from '../../core/audit/audit.service';
 *
 *   await writeAuditLog({
 *     workspaceId, actorId: request.user!.id,
 *     entityType: 'TASK', entityId: task.id, entityTitle: task.title,
 *     action: 'CREATED',
 *   });
 */

import { prisma } from '../../infrastructure/database/prisma';
import { Prisma, type AuditAction, type AuditEntityType } from '@prisma/client';

export interface AuditEntry {
  workspaceId: string;
  actorId: string;
  entityType: AuditEntityType;
  entityId: string;
  entityTitle?: string | null | undefined;
  action: AuditAction;
  meta?: Record<string, unknown> | undefined;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId:  entry.workspaceId,
        actorId:      entry.actorId,
        entityType:   entry.entityType,
        entityId:     entry.entityId,
        entityTitle:  entry.entityTitle ?? null,
        action:       entry.action,
        meta:         entry.meta
          ? (entry.meta as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    // Never let an audit failure surface to the caller
    console.error('[audit] Failed to write log entry:', err);
  }
}
