import { EmberlynTool } from '../tool-context';
import { generateIdentifier } from '../../utils/identifier';

// ─── list_projects ────────────────────────────────────────────────────────────
const listProjects: EmberlynTool = {
  name: 'list_projects',
  description: 'List all projects in the workspace with their status, team, and task/member counts.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
        description: 'Filter by project status',
      },
      teamId: { type: 'string', description: 'Filter to projects owned by this team UUID' },
    },
  },
  async execute(args, ctx) {
    const { status, teamId } = args as { status?: string; teamId?: string };

    const projects = await ctx.prisma.project.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(teamId ? { teamId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        identifier: true,
        name: true,
        description: true,
        status: true,
        team: { select: { id: true, name: true } },
        _count: { select: { tasks: true, members: true, milestones: true } },
      },
    });

    return { count: projects.length, projects };
  },
};

// ─── get_project ──────────────────────────────────────────────────────────────
const getProject: EmberlynTool = {
  name: 'get_project',
  description: 'Get full details of a project including its milestones, goals, and member list.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project UUID or identifier (e.g. "PROJ-3")' },
    },
    required: ['projectId'],
  },
  async execute(args, ctx) {
    const { projectId } = args as { projectId: string };

    const isUuid = /^[0-9a-f-]{36}$/.test(projectId);
    const where = isUuid
      ? { id: projectId, workspaceId: ctx.workspaceId }
      : { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: projectId.toUpperCase() } };

    const project = await ctx.prisma.project.findUnique({
      where: where as never,
      include: {
        team: { select: { id: true, name: true } },
        milestones: {
          orderBy: { dueDate: 'asc' },
          select: { id: true, name: true, dueDate: true, isCompleted: true, _count: { select: { tasks: true } } },
        },
        goals: {
          select: { id: true, name: true, targetValue: true, currentValue: true },
        },
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project || project.deletedAt) {
      return { error: `Project "${projectId}" not found.` };
    }

    // Enrich members with user details (ProjectMember has no direct user relation)
    const userIds = project.members.map((m) => m.userId);
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      ...project,
      members: project.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        user: userMap.get(m.userId) ?? null,
      })),
    };
  },
};

// ─── create_project ───────────────────────────────────────────────────────────
const createProject: EmberlynTool = {
  name: 'create_project',
  description: 'Create a new project in the workspace.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Project name (required)' },
      description: { type: 'string', description: 'Short description of the project' },
      status: {
        type: 'string',
        enum: ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
        description: 'Initial status (default: PLANNED)',
      },
      teamId: { type: 'string', description: 'UUID of the team that owns this project' },
    },
    required: ['name'],
  },
  async execute(args, ctx) {
    const { name, description, status, teamId } = args as {
      name: string;
      description?: string;
      status?: string;
      teamId?: string;
    };

    const identifier = await generateIdentifier(ctx.workspaceId, 'PROJ', 'project');

    const project = await ctx.prisma.project.create({
      data: {
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
        identifier,
        name,
        description: description ?? null,
        status: (status as never) ?? 'PLANNED',
        teamId: teamId ?? null,
      },
    });

    return { success: true, project };
  },
};

// ─── update_project ───────────────────────────────────────────────────────────
const updateProject: EmberlynTool = {
  name: 'update_project',
  description: 'Update a project\'s name, description, or status.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project UUID or identifier' },
      name: { type: 'string', description: 'New project name' },
      description: { type: 'string', description: 'New description' },
      status: {
        type: 'string',
        enum: ['PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      },
    },
    required: ['projectId'],
  },
  async execute(args, ctx) {
    const { projectId, name, description, status } = args as {
      projectId: string;
      name?: string;
      description?: string;
      status?: string;
    };

    const isUuid = /^[0-9a-f-]{36}$/.test(projectId);
    let resolvedId = projectId;

    if (!isUuid) {
      const found = await ctx.prisma.project.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: projectId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Project "${projectId}" not found.` };
      resolvedId = found.id;
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const project = await ctx.prisma.project.update({
      where: { id: resolvedId },
      data: updateData,
    });

    return { success: true, project };
  },
};

// ─── create_milestone ─────────────────────────────────────────────────────────
const createMilestone: EmberlynTool = {
  name: 'create_milestone',
  description: 'Add a milestone to a project with an optional due date.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project UUID or identifier' },
      name: { type: 'string', description: 'Milestone name' },
      dueDate: { type: 'string', description: 'Due date as ISO 8601 string' },
    },
    required: ['projectId', 'name'],
  },
  async execute(args, ctx) {
    const { projectId, name, dueDate } = args as { projectId: string; name: string; dueDate?: string };

    const isUuid = /^[0-9a-f-]{36}$/.test(projectId);
    let resolvedProjectId = projectId;

    if (!isUuid) {
      const found = await ctx.prisma.project.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: projectId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Project "${projectId}" not found.` };
      resolvedProjectId = found.id;
    }

    const milestone = await ctx.prisma.milestone.create({
      data: {
        projectId: resolvedProjectId,
        createdById: ctx.userId,
        name,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return { success: true, milestone };
  },
};

// ─── update_milestone ─────────────────────────────────────────────────────────
const updateMilestone: EmberlynTool = {
  name: 'update_milestone',
  description: 'Mark a milestone as complete or update its name and due date.',
  parameters: {
    type: 'object',
    properties: {
      milestoneId: { type: 'string', description: 'Milestone UUID' },
      name: { type: 'string', description: 'New milestone name' },
      dueDate: { type: 'string', description: 'New due date ISO 8601 string, or null to clear' },
      isCompleted: { type: 'boolean', description: 'Mark the milestone as completed or incomplete' },
    },
    required: ['milestoneId'],
  },
  async execute(args, ctx) {
    const { milestoneId, name, dueDate, isCompleted } = args as {
      milestoneId: string;
      name?: string;
      dueDate?: string | null;
      isCompleted?: boolean;
    };

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if ('dueDate' in args) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const milestone = await ctx.prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return { success: true, milestone };
  },
};

// ─── create_goal ──────────────────────────────────────────────────────────────
const createGoal: EmberlynTool = {
  name: 'create_goal',
  description: 'Add a strategic goal to a project with a target value (default 100).',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project UUID or identifier' },
      name: { type: 'string', description: 'Goal name' },
      targetValue: { type: 'number', description: 'Target value (default 100)' },
      currentValue: { type: 'number', description: 'Current starting value (default 0)' },
    },
    required: ['projectId', 'name'],
  },
  async execute(args, ctx) {
    const { projectId, name, targetValue, currentValue } = args as {
      projectId: string;
      name: string;
      targetValue?: number;
      currentValue?: number;
    };

    const isUuid = /^[0-9a-f-]{36}$/.test(projectId);
    let resolvedProjectId = projectId;

    if (!isUuid) {
      const found = await ctx.prisma.project.findUnique({
        where: { workspaceId_identifier: { workspaceId: ctx.workspaceId, identifier: projectId.toUpperCase() } },
        select: { id: true },
      });
      if (!found) return { error: `Project "${projectId}" not found.` };
      resolvedProjectId = found.id;
    }

    const goal = await ctx.prisma.goal.create({
      data: {
        projectId: resolvedProjectId,
        createdById: ctx.userId,
        name,
        targetValue: targetValue ?? 100,
        currentValue: currentValue ?? 0,
      },
    });

    return { success: true, goal };
  },
};

// ─── update_goal ──────────────────────────────────────────────────────────────
const updateGoal: EmberlynTool = {
  name: 'update_goal',
  description: 'Update the current progress value of a goal.',
  parameters: {
    type: 'object',
    properties: {
      goalId: { type: 'string', description: 'Goal UUID' },
      currentValue: { type: 'number', description: 'Updated progress value' },
      name: { type: 'string', description: 'Updated goal name' },
      targetValue: { type: 'number', description: 'Updated target value' },
    },
    required: ['goalId'],
  },
  async execute(args, ctx) {
    const { goalId, currentValue, name, targetValue } = args as {
      goalId: string;
      currentValue?: number;
      name?: string;
      targetValue?: number;
    };

    const updateData: Record<string, unknown> = {};
    if (currentValue !== undefined) updateData.currentValue = currentValue;
    if (name !== undefined) updateData.name = name;
    if (targetValue !== undefined) updateData.targetValue = targetValue;

    const goal = await ctx.prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });

    return { success: true, goal };
  },
};

export const projectTools: EmberlynTool[] = [
  listProjects,
  getProject,
  createProject,
  updateProject,
  createMilestone,
  updateMilestone,
  createGoal,
  updateGoal,
];
