/**
 * mention.service.ts
 *
 * Extracts @mentions from chat message content and fires TASK_MENTIONED
 * notifications to each matched workspace member.
 *
 * Mention syntax supported:
 *   @John           — matches by display name (case-insensitive, first match wins)
 *   @john.doe       — same rule, spaces replaced with dots also match
 *
 * Called from both the WebSocket handler and the HTTP REST fallback so the
 * logic lives in exactly one place.
 *
 * Usage:
 *   await dispatchMentionNotifications({
 *     content, senderId, senderName, channelId, workspaceId, messageId,
 *   });
 */

import { prisma } from '../../infrastructure/database/prisma';
import { NotificationService } from './notification.service';

export interface MentionContext {
  content:     string;   // raw message text
  senderId:    string;
  senderName:  string;
  channelId:   string;
  workspaceId: string;
  messageId:   string;
  channelName?: string | undefined;
}

/**
 * Parse @name tokens from message content.
 * Returns an array of lowercase slugs: "john doe" → "john doe" and "john.doe".
 */
function parseMentionSlugs(content: string): string[] {
  // Matches @word, @word.word, @word-word — stops at space / punctuation
  const regex = /@([\w.'-]+)/g;
  const slugs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1]!.toLowerCase();
    slugs.push(raw);
    // Also push dot-replaced version so "@john.doe" matches name "John Doe"
    slugs.push(raw.replace(/\./g, ' '));
  }
  return [...new Set(slugs)]; // deduplicate
}

export async function dispatchMentionNotifications(ctx: MentionContext): Promise<void> {
  const slugs = parseMentionSlugs(ctx.content);
  if (slugs.length === 0) return;

  try {
    // Load all members of this workspace once — cheap for typical workspace sizes
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { userId: true, user: { select: { id: true, name: true } } },
    });

    // Match slugs → workspace users (name comparison, case-insensitive)
    const mentioned = new Set<string>();
    for (const { user } of members) {
      if (user.id === ctx.senderId) continue; // never notify the sender

      const nameLower = user.name.toLowerCase();
      // Try exact name match OR dot-slug match
      const dotSlug = nameLower.replace(/\s+/g, '.');
      if (slugs.includes(nameLower) || slugs.includes(dotSlug)) {
        mentioned.add(user.id);
      }
    }

    if (mentioned.size === 0) return;

    const channelLabel = ctx.channelName ? `#${ctx.channelName}` : 'a channel';
    const preview = ctx.content.length > 80 ? `${ctx.content.slice(0, 80)}…` : ctx.content;

    await Promise.all(
      Array.from(mentioned).map((recipientId) =>
        NotificationService.send({
          recipientId,
          workspaceId:  ctx.workspaceId,
          type:         'TASK_MENTIONED',
          title:        `${ctx.senderName} mentioned you in ${channelLabel}`,
          body:         preview,
          entityType:   'CHANNEL',
          entityId:     ctx.channelId,
          entityTitle:  channelLabel,
          actorId:      ctx.senderId,
          actorName:    ctx.senderName,
        })
      )
    );
  } catch (err) {
    console.error('[mentions] Failed to dispatch mention notifications:', err);
  }
}
