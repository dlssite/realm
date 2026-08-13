import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { generateIdentifier } from '../../core/utils/identifier';
import { writeAuditLog } from '../../core/audit/audit.service';
import { NotificationService } from '../../core/notifications/notification.service';

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).default('TODO'),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE']).default('NONE'),
  projectId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default('#6366f1'),
});

const createDependencySchema = z.object({
  blockingTaskId: z.string().uuid(),
});

// ── Route Handler ───────────────────────────────────────────────────────────
export async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // ── GET /api/v1/workspaces/:workspaceId/labels ───────────────────────────
  fastify.get(
    '/:workspaceId/labels',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const labels = await prisma.label.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
      });
      return reply.send(labels);
    }
  );

  // ── POST /api/v1/workspaces/:workspaceId/labels ──────────────────────────
  fastify.post(
    '/:workspaceId/labels',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const parse = createLabelSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid label data' } });
      }

      const label = await prisma.label.upsert({
        where: { workspaceId_name: { workspaceId, name: parse.data.name } },
        update: { color: parse.data.color },
        create: { workspaceId, name: parse.data.name, color: parse.data.color },
      });
      return reply.status(201).send(label);
    }
  );

  // ── GET /api/v1/workspaces/:workspaceId/tasks ────────────────────────────
  fastify.get(
    '/:workspaceId/tasks',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      const { projectId, status, priority, assigneeId, search, labelId, milestoneId } = request.query as Record<string, string>;

      const tasks = await prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          parentId: null,
          ...(projectId    && { projectId }),
          ...(milestoneId  && { milestoneId }),
          ...(status       && { status: status as any }),
          ...(priority     && { priority: priority as any }),
          ...(assigneeId   && { assigneeId }),
          ...(search && {
            OR: [
              { title:      { contains: search, mode: 'insensitive' } },
              { identifier: { contains: search, mode: 'insensitive' } },
            ],
          }),
          ...(labelId && { labels: { some: { labelId } } }),
        },
        include: {
          assignee:  { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          labels:    { include: { label: true } },
          subtasks: {
            where: { deletedAt: null },
            select: { id: true, identifier: true, title: true, status: true, priority: true, assignee: { select: { id: true, name: true } } },
          },
          blockedBy: { select: { blockingTaskId: true } },
          _count:    { select: { subtasks: true, comments: true } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      });

      return reply.send(tasks);
    }
  );

  // Helper to validate assignee team membership
  const validateAssigneeTeam = async (
    workspaceId: string,
    projectId: string | null | undefined,
    assigneeId: string | null | undefined,
  ) => {
    if (!projectId || !assigneeId) return true;

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { teamId: true },
    });
    if (!project || !project.teamId) return true;

    const teamMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: project.teamId, userId: assigneeId } },
    });
    if (teamMember) return true;

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
    });
    return !!(wsMember && ['OWNER', 'ADMIN', 'MANAGER'].includes(wsMember.role));
  };

  // ── POST /api/v1/workspaces/:workspaceId/tasks ───────────────────────────
  fastify.post(
    '/:workspaceId/tasks',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.params as { workspaceId: string };

      const parseResult = createTaskSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid task data', details: parseResult.error.flatten().fieldErrors },
        });
      }

      const { title, description, status, priority, projectId, milestoneId, parentId, assigneeId, dueDate } = parseResult.data;

      const isValidAssignee = await validateAssigneeTeam(workspaceId, projectId, assigneeId);
      if (!isValidAssignee) {
        return reply.status(400).send({
          error: { code: 'INVALID_ASSIGNEE', message: 'Task assignee must be a member of the project team' },
        });
      }

      const identifier = await generateIdentifier(workspaceId, 'TASK', 'task');

      const task = await prisma.task.create({
        data: {
          workspaceId,
          createdById: request.user!.id,
          identifier,
          title,
          status,
          priority,
          description:  description ?? null,
          projectId:    projectId   ?? null,
          milestoneId:  milestoneId ?? null,
          parentId:     parentId    ?? null,
          assigneeId:   assigneeId  ?? null,
          dueDate:      dueDate ? new Date(dueDate) : null,
        },
        include: {
          assignee:  { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          project:   { select: { id: true, name: true, identifier: true, teamId: true, team: { select: { id: true, name: true } } } },
          labels:    { include: { label: true } },
          _count:    { select: { subtasks: true, comments: true } },
        },
      });

      // ── Audit ──────────────────────────────────────────────────────────────
      await writeAuditLog({
        workspaceId,
        actorId:     request.user!.id,
        entityType:  'TASK',
        entityId:    task.id,
        entityTitle: `${task.identifier} · ${task.title}`,
        action:      'CREATED',
        meta: {
          status,
          priority,
          ...(assigneeId && { assigneeId }),
          ...(task.project && { projectName: task.project.name }),
        },
      });

      // ── Notification: tell the assignee they have a new task ───────────────
      if (assigneeId && assigneeId !== request.user!.id) {
        const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } });
        await NotificationService.send({
          recipientId:  assigneeId,
          workspaceId,
          type:         'TASK_ASSIGNED',
          title:        `${actor?.name ?? 'Someone'} assigned you "${task.title}"`,
          body:         task.project ? `In project ${task.project.name}` : undefined,
          entityType:   'TASK',
          entityId:     task.id,
          entityTitle:  `${task.identifier} · ${task.title}`,
          actorId:      request.user!.id,
          actorName:    actor?.name ?? null,
        });
      }

      return reply.status(201).send(task);
    }
  );

  // ── GET /api/v1/workspaces/:workspaceId/tasks/:taskId ────────────────────
  fastify.get(
    '/:workspaceId/tasks/:taskId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, taskId } = request.params as { workspaceId: string; taskId: string };

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId, deletedAt: null },
        include: {
          assignee:  { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          project:   { select: { id: true, name: true, identifier: true, teamId: true, team: { select: { id: true, name: true } } } },
          milestone: { select: { id: true, name: true } },
          labels:    { include: { label: true } },
          subtasks: {
            where: { deletedAt: null },
            include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: { id: true, name: true, avatarUrl: true } } },
          },
          blockedBy: { include: { blockingTask: { select: { id: true, identifier: true, title: true, status: true } } } },
          blocks:    { include: { blockedTask:  { select: { id: true, identifier: true, title: true, status: true } } } },
        },
      });

      if (!task) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
      }

      return reply.send(task);
    }
  );

  // ── PATCH /api/v1/workspaces/:workspaceId/tasks/:taskId ──────────────────
  fastify.patch(
    '/:workspaceId/tasks/:taskId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, taskId } = request.params as { workspaceId: string; taskId: string };

      const parseResult = updateTaskSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid update data' } });
      }

      const existingTask = await prisma.task.findFirst({ where: { id: taskId, workspaceId } });
      if (!existingTask) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
      }

      const { title, description, status, priority, projectId, milestoneId, parentId, assigneeId, dueDate } = parseResult.data;

      const targetProjectId  = projectId  !== undefined ? projectId  : existingTask.projectId;
      const targetAssigneeId = assigneeId !== undefined ? assigneeId : existingTask.assigneeId;

      if (assigneeId !== undefined || projectId !== undefined) {
        const isValidAssignee = await validateAssigneeTeam(workspaceId, targetProjectId, targetAssigneeId);
        if (!isValidAssignee) {
          return reply.status(400).send({
            error: { code: 'INVALID_ASSIGNEE', message: 'Task assignee must be a member of the project team' },
          });
        }
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(title       !== undefined && { title }),
          ...(status      !== undefined && { status }),
          ...(priority    !== undefined && { priority }),
          ...(description !== undefined && { description: description ?? null }),
          ...(projectId   !== undefined && { projectId:   projectId   ?? null }),
          ...(milestoneId !== undefined && { milestoneId: milestoneId ?? null }),
          ...(parentId    !== undefined && { parentId:    parentId    ?? null }),
          ...(assigneeId  !== undefined && { assigneeId:  assigneeId  ?? null }),
          ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          project:  { select: { id: true, name: true, identifier: true, teamId: true, team: { select: { id: true, name: true } } } },
          labels:   { include: { label: true } },
          _count:   { select: { subtasks: true, comments: true } },
        },
      });

      const entityTitle = `${existingTask.identifier} · ${updated.title}`;

      // ── Audit: specialised action for the most meaningful field changes ──
      if (status !== undefined && status !== existingTask.status) {
        await writeAuditLog({
          workspaceId, actorId: request.user!.id,
          entityType: 'TASK', entityId: taskId, entityTitle,
          action: 'STATUS_CHANGED',
          meta: { from: existingTask.status, to: status },
        });
      }

      if (priority !== undefined && priority !== existingTask.priority) {
        await writeAuditLog({
          workspaceId, actorId: request.user!.id,
          entityType: 'TASK', entityId: taskId, entityTitle,
          action: 'PRIORITY_CHANGED',
          meta: { from: existingTask.priority, to: priority },
        });
      }

      if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
        await writeAuditLog({
          workspaceId, actorId: request.user!.id,
          entityType: 'TASK', entityId: taskId, entityTitle,
          action: 'ASSIGNED',
          meta: {
            from: existingTask.assigneeId ?? null,
            to:   updated.assignee?.name  ?? assigneeId,
          },
        });

        // ── Notification: new assignee ────────────────────────────────────────
        if (assigneeId && assigneeId !== request.user!.id) {
          const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } });
          await NotificationService.send({
            recipientId:  assigneeId,
            workspaceId,
            type:         'TASK_ASSIGNED',
            title:        `${actor?.name ?? 'Someone'} assigned you "${updated.title}"`,
            entityType:   'TASK',
            entityId:     taskId,
            entityTitle:  entityTitle,
            actorId:      request.user!.id,
            actorName:    actor?.name ?? null,
          });
        }
      }

      // ── Notification: status changed on a task you're assigned to ──────────
      if (
        status !== undefined &&
        status !== existingTask.status &&
        existingTask.assigneeId &&
        existingTask.assigneeId !== request.user!.id
      ) {
        const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } });
        await NotificationService.send({
          recipientId:  existingTask.assigneeId,
          workspaceId,
          type:         'TASK_STATUS_CHANGED',
          title:        `${actor?.name ?? 'Someone'} moved "${updated.title}" to ${status.replace(/_/g, ' ')}`,
          entityType:   'TASK',
          entityId:     taskId,
          entityTitle:  entityTitle,
          actorId:      request.user!.id,
          actorName:    actor?.name ?? null,
        });
      }

      // Generic UPDATED for title, description, dueDate, projectId, milestoneId
      const genericFields = ['title', 'description', 'dueDate', 'projectId', 'milestoneId', 'parentId'] as const;
      const changedGeneric = genericFields.filter((f) => parseResult.data[f] !== undefined);
      if (changedGeneric.length > 0) {
        await writeAuditLog({
          workspaceId, actorId: request.user!.id,
          entityType: 'TASK', entityId: taskId, entityTitle,
          action: 'UPDATED',
          meta: { fields: changedGeneric },
        });
      }

      return reply.send(updated);
    }
  );

  // ── DELETE /api/v1/workspaces/:workspaceId/tasks/:taskId ─────────────────
  fastify.delete(
    '/:workspaceId/tasks/:taskId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, taskId } = request.params as { workspaceId: string; taskId: string };

      const task = await prisma.task.findFirst({
        where: { id: taskId, workspaceId },
        select: { id: true, identifier: true, title: true },
      });

      await prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date() } });

      if (task) {
        await writeAuditLog({
          workspaceId, actorId: request.user!.id,
          entityType: 'TASK', entityId: taskId,
          entityTitle: `${task.identifier} · ${task.title}`,
          action: 'DELETED',
        });
      }

      return reply.status(204).send();
    }
  );

  // ── POST /api/v1/workspaces/:workspaceId/tasks/:taskId/comments ──────────
  fastify.post(
    '/:workspaceId/tasks/:taskId/comments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, taskId } = request.params as { workspaceId: string; taskId: string };

      const parseResult = createCommentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Comment body is required' } });
      }

      const comment = await prisma.taskComment.create({
        data: { taskId, authorId: request.user!.id, body: parseResult.data.body },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });

      // Fetch the parent task title for the log entry
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { identifier: true, title: true, assigneeId: true, createdById: true },
      });

      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'TASK', entityId: taskId,
        entityTitle: task ? `${task.identifier} · ${task.title}` : null,
        action: 'COMMENTED',
        meta: { commentId: comment.id, preview: parseResult.data.body.slice(0, 120) },
      });

      // ── Notifications: tell assignee + task owner about the comment ─────────
      if (task) {
        const actor = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { name: true } });
        const taskLabel = `${task.identifier} · ${task.title}`;
        // Collect unique recipients (exclude the commenter themselves)
        const recipients = new Set<string>();
        if (task.assigneeId  && task.assigneeId  !== request.user!.id) recipients.add(task.assigneeId);
        if (task.createdById && task.createdById !== request.user!.id) recipients.add(task.createdById);

        for (const recipientId of recipients) {
          await NotificationService.send({
            recipientId,
            workspaceId,
            type:        'TASK_COMMENT_ADDED',
            title:       `${actor?.name ?? 'Someone'} commented on "${task.title}"`,
            body:        parseResult.data.body.slice(0, 120),
            entityType:  'TASK',
            entityId:    taskId,
            entityTitle: taskLabel,
            actorId:     request.user!.id,
            actorName:   actor?.name ?? null,
          });
        }
      }

      return reply.status(201).send(comment);
    }
  );

  // ── POST /api/v1/workspaces/:workspaceId/tasks/:taskId/dependencies ─────
  fastify.post(
    '/:workspaceId/tasks/:taskId/dependencies',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { taskId } = request.params as { workspaceId: string; taskId: string };
      const parse = createDependencySchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'blockingTaskId is required' } });
      }

      const dep = await prisma.taskDependency.create({
        data: {
          blockedTaskId:  taskId,
          blockingTaskId: parse.data.blockingTaskId,
        },
      });
      return reply.status(201).send(dep);
    }
  );

  // ── DELETE /api/v1/workspaces/:workspaceId/tasks/:taskId/dependencies/:blockingTaskId ─
  fastify.delete(
    '/:workspaceId/tasks/:taskId/dependencies/:blockingTaskId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { taskId, blockingTaskId } = request.params as { workspaceId: string; taskId: string; blockingTaskId: string };
      await prisma.taskDependency.delete({
        where: { blockingTaskId_blockedTaskId: { blockedTaskId: taskId, blockingTaskId } },
      });
      return reply.status(204).send();
    }
  );

  // ── POST /api/v1/workspaces/:workspaceId/tasks/:taskId/labels ────────────
  fastify.post(
    '/:workspaceId/tasks/:taskId/labels',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId, taskId } = request.params as { workspaceId: string; taskId: string };
      const { labelId } = request.body as { labelId: string };
      if (!labelId) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'labelId is required' } });

      const taskLabel = await prisma.taskLabel.create({
        data: { taskId, labelId },
        include: { label: true },
      });

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { identifier: true, title: true },
      });

      await writeAuditLog({
        workspaceId, actorId: request.user!.id,
        entityType: 'TASK', entityId: taskId,
        entityTitle: task ? `${task.identifier} · ${task.title}` : null,
        action: 'UPDATED',
        meta: { fields: ['labels'], labelAdded: taskLabel.label.name },
      });

      return reply.status(201).send(taskLabel);
    }
  );

  // ── DELETE /api/v1/workspaces/:workspaceId/tasks/:taskId/labels/:labelId ──
  fastify.delete(
    '/:workspaceId/tasks/:taskId/labels/:labelId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { taskId, labelId } = request.params as { workspaceId: string; taskId: string; labelId: string };
      await prisma.taskLabel.delete({
        where: { taskId_labelId: { taskId, labelId } },
      });
      return reply.status(204).send();
    }
  );
}
