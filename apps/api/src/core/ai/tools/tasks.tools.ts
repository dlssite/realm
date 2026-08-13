import { EmberlynTool } from '../tool-context';
import { generateIdentifier } from '../../utils/identifier';

// ─── search_tasks ─────────────────────────────────────────────────────────────
const searchTasks: EmberlynTool = {
  name: 'search_tasks',
  description:
    'List and filter tasks in the workspace. Use this to find tasks by project, status, priority, assignee, or a text search query. Returns up to 25 results by default.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Text to search in task title or description' },
      projectId: { type: 'string', description: 'Filter to tasks belonging to this project UUID' },
      status: {
        type: 'string',
        enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'],
        description: 'Filter by task status',
      },
      priority: {
        type: 'string',
        enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'],
        description: 'Filter by task priority',
      },
      assigneeId: { type: 'string', description: 'Filter to tasks assigned to this user UUID' },
      limit: { type: 'number', description: 'Max results to return (default 25, max 50)' },
    },
  },
  async execute(args, ctx) {
    const { query, projectId, status, priority, assigneeId, limit } = args as {
      query?: string;
      projectId?: string;
      status?: string;
      priority?: string;
      assigneeId?: string;
      limit?: number;
    };

    const take = Math.min(limit ?? 25, 50);

    const tasks = await ctx.prisma.task.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status: status as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        identifier: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    });

    return { count: tasks.length, tasks };
  },
};

// ─── get_task ─────────────────────────────────────────────────────────────────
const getTask: EmberlynTool = {
  name: 'get_task',
  description:
    'Read a single task with its full details: description, comments, subtasks, labels, and dependencies. Use when the user asks about a specific task by identifier (e.g. TASK-42) or UUID.',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'The task UUID or identifier string (e.g. "TASK-42")' },
    },
    required: ['taskId'],
  },
  async execute(args, ctx) {
    const { taskId } = args as { taskId: string };

    // Support both UUID and identifier lookup
    const isUuid = /^[0-9a-f-]{36}$/.test(taskId);
    const where = isUuid
      ? { id: taskId, workspaceId: ctx.workspaceId }
      : { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: taskId.toUpperCase() } };

    const task = await ctx.prisma.task.findUnique({
      where: where as never,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, identifier: true } },
        milestone: { select: { id: true, name: true, dueDate: true } },
        subtasks: {
          where: { deletedAt: null },
          select: { id: true, identifier: true, title: true, status: true, assignee: { select: { name: true } } },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        },
        labels: { include: { label: true } },
        blockedBy: {
          include: { blockingTask: { select: { id: true, identifier: true, title: true, status: true } } },
        },
        blocks: {
          include: { blockedTask: { select: { id: true, identifier: true, title: true, status: true } } },
        },
      },
    });

    if (!task || task.deletedAt) {
      return { error: `Task "${taskId}" not found in this workspace.` };
    }
    return task;
  },
};

// ─── create_task ─────────────────────────────────────────────────────────────
const createTask: EmberlynTool = {
  name: 'create_task',
  description:
    'Create a new task in the workspace. Always confirm the key details (title, project, assignee) with the user before creating unless the request is completely unambiguous.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title (required)' },
      description: { type: 'string', description: 'Detailed description of the task' },
      projectId: { type: 'string', description: 'UUID of the project this task belongs to' },
      status: {
        type: 'string',
        enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'],
        description: 'Initial status (default: TODO)',
      },
      priority: {
        type: 'string',
        enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'],
        description: 'Task priority (default: NONE)',
      },
      assigneeId: { type: 'string', description: 'UUID of the workspace member to assign this task to' },
      dueDate: { type: 'string', description: 'Due date as ISO 8601 string (e.g. 2026-09-01T00:00:00Z)' },
      milestoneId: { type: 'string', description: 'UUID of the milestone to attach this task to' },
    },
    required: ['title'],
  },
  async execute(args, ctx) {
    const { title, description, projectId, status, priority, assigneeId, dueDate, milestoneId } = args as {
      title: string;
      description?: string;
      projectId?: string;
      status?: string;
      priority?: string;
      assigneeId?: string;
      dueDate?: string;
      milestoneId?: string;
    };

    const identifier = await generateIdentifier(ctx.workspaceId, 'TASK', 'task');

    const task = await ctx.prisma.task.create({
      data: {
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
        identifier,
        title,
        description: description ?? null,
        status: (status as never) ?? 'TODO',
        priority: (priority as never) ?? 'NONE',
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId ?? null,
        milestoneId: milestoneId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return { success: true, task };
  },
};

// ─── update_task ─────────────────────────────────────────────────────────────
const updateTask: EmberlynTool = {
  name: 'update_task',
  description:
    'Update one or more fields on an existing task. Supports partial updates — only provide the fields you want to change.',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'The task UUID or identifier (e.g. "TASK-42")' },
      title: { type: 'string', description: 'New title' },
      description: { type: 'string', description: 'New description' },
      status: {
        type: 'string',
        enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'],
      },
      priority: {
        type: 'string',
        enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'],
      },
      assigneeId: { type: 'string', description: 'UUID of the new assignee, or null to unassign' },
      dueDate: { type: 'string', description: 'New due date ISO 8601 string, or null to clear' },
      projectId: { type: 'string', description: 'Move task to a different project UUID' },
    },
    required: ['taskId'],
  },
  async execute(args, ctx) {
    const { taskId, ...fields } = args as {
      taskId: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
      projectId?: string;
    };

    const isUuid = /^[0-9a-f-]{36}$/.test(taskId);
    let resolvedId = taskId;

    if (!isUuid) {
      const found = await ctx.prisma.task.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: taskId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Task "${taskId}" not found.` };
      resolvedId = found.id;
    }

    const updateData: Record<string, unknown> = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.status !== undefined) updateData.status = fields.status;
    if (fields.priority !== undefined) updateData.priority = fields.priority;
    if ('assigneeId' in fields) updateData.assigneeId = fields.assigneeId ?? null;
    if ('dueDate' in fields) updateData.dueDate = fields.dueDate ? new Date(fields.dueDate) : null;
    if (fields.projectId !== undefined) updateData.projectId = fields.projectId;

    const task = await ctx.prisma.task.update({
      where: { id: resolvedId },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return { success: true, task };
  },
};

// ─── add_task_comment ─────────────────────────────────────────────────────────
const addTaskComment: EmberlynTool = {
  name: 'add_task_comment',
  description: 'Post a comment on a task on behalf of the current user.',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'Task UUID or identifier (e.g. "TASK-42")' },
      body: { type: 'string', description: 'The comment text' },
    },
    required: ['taskId', 'body'],
  },
  async execute(args, ctx) {
    const { taskId, body } = args as { taskId: string; body: string };

    const isUuid = /^[0-9a-f-]{36}$/.test(taskId);
    let resolvedId = taskId;

    if (!isUuid) {
      const found = await ctx.prisma.task.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: taskId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Task "${taskId}" not found.` };
      resolvedId = found.id;
    }

    const comment = await ctx.prisma.taskComment.create({
      data: { taskId: resolvedId, authorId: ctx.userId, body },
      include: { author: { select: { id: true, name: true } } },
    });

    return { success: true, comment };
  },
};

// ─── create_subtask ───────────────────────────────────────────────────────────
const createSubtask: EmberlynTool = {
  name: 'create_subtask',
  description: 'Create a subtask under a parent task. Subtasks are 1 level deep max.',
  parameters: {
    type: 'object',
    properties: {
      parentTaskId: { type: 'string', description: 'Parent task UUID or identifier' },
      title: { type: 'string', description: 'Subtask title' },
      status: {
        type: 'string',
        enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'],
        description: 'Initial status (default: TODO)',
      },
      assigneeId: { type: 'string', description: 'UUID of the assignee' },
    },
    required: ['parentTaskId', 'title'],
  },
  async execute(args, ctx) {
    const { parentTaskId, title, status, assigneeId } = args as {
      parentTaskId: string;
      title: string;
      status?: string;
      assigneeId?: string;
    };

    const isUuid = /^[0-9a-f-]{36}$/.test(parentTaskId);
    let resolvedParentId = parentTaskId;

    if (!isUuid) {
      const found = await ctx.prisma.task.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: parentTaskId.toUpperCase() } },
        select: { id: true, projectId: true },
      });
      if (!found) return { error: `Parent task "${parentTaskId}" not found.` };
      resolvedParentId = found.id;
    }

    const parent = await ctx.prisma.task.findUnique({
      where: { id: resolvedParentId },
      select: { projectId: true, workspaceId: true },
    });

    if (!parent || parent.workspaceId !== ctx.workspaceId) {
      return { error: 'Parent task not found in this workspace.' };
    }

    const identifier = await generateIdentifier(ctx.workspaceId, 'TASK', 'task');

    const subtask = await ctx.prisma.task.create({
      data: {
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
        identifier,
        title,
        status: (status as never) ?? 'TODO',
        priority: 'NONE',
        parentId: resolvedParentId,
        projectId: parent.projectId ?? null,
        assigneeId: assigneeId ?? null,
      },
    });

    return { success: true, subtask };
  },
};

// ─── assign_task ──────────────────────────────────────────────────────────────
const assignTask: EmberlynTool = {
  name: 'assign_task',
  description: 'Assign or reassign a task to a workspace member. Use get_member to look up the user UUID from a name first if needed.',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'Task UUID or identifier' },
      assigneeId: { type: 'string', description: 'UUID of the workspace member to assign. Pass null to unassign.' },
    },
    required: ['taskId', 'assigneeId'],
  },
  async execute(args, ctx) {
    const { taskId, assigneeId } = args as { taskId: string; assigneeId: string | null };

    const isUuid = /^[0-9a-f-]{36}$/.test(taskId);
    let resolvedId = taskId;

    if (!isUuid) {
      const found = await ctx.prisma.task.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: taskId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Task "${taskId}" not found.` };
      resolvedId = found.id;
    }

    const task = await ctx.prisma.task.update({
      where: { id: resolvedId },
      data: { assigneeId: assigneeId ?? null },
      include: { assignee: { select: { id: true, name: true } } },
    });

    return { success: true, task };
  },
};

// ─── set_task_due_date ────────────────────────────────────────────────────────
const setTaskDueDate: EmberlynTool = {
  name: 'set_task_due_date',
  description: 'Set or clear the due date on a task.',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'Task UUID or identifier' },
      dueDate: {
        type: 'string',
        description: 'Due date as ISO 8601 string (e.g. 2026-09-15T00:00:00Z). Pass null to clear.',
      },
    },
    required: ['taskId'],
  },
  async execute(args, ctx) {
    const { taskId, dueDate } = args as { taskId: string; dueDate?: string | null };

    const isUuid = /^[0-9a-f-]{36}$/.test(taskId);
    let resolvedId = taskId;

    if (!isUuid) {
      const found = await ctx.prisma.task.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: taskId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Task "${taskId}" not found.` };
      resolvedId = found.id;
    }

    const task = await ctx.prisma.task.update({
      where: { id: resolvedId },
      data: { dueDate: dueDate ? new Date(dueDate) : null },
      select: { id: true, identifier: true, title: true, dueDate: true },
    });

    return { success: true, task };
  },
};

export const taskTools: EmberlynTool[] = [
  searchTasks,
  getTask,
  createTask,
  updateTask,
  addTaskComment,
  createSubtask,
  assignTask,
  setTaskDueDate,
];
