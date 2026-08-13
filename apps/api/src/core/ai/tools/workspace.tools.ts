import { EmberlynTool } from '../tool-context';

// ─── list_workspace_members ───────────────────────────────────────────────────
const listWorkspaceMembers: EmberlynTool = {
  name: 'list_workspace_members',
  description: 'List all members in the workspace with their roles. Use this to discover who is in the workspace before assigning tasks or mentioning people.',
  parameters: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        enum: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST'],
        description: 'Filter by workspace role',
      },
    },
  },
  async execute(args, ctx) {
    const { role } = args as { role?: string };

    const members = await ctx.prisma.workspaceMember.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(role ? { role: role as never } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      count: members.length,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        joinedAt: m.createdAt,
      })),
    };
  },
};

// ─── get_member ───────────────────────────────────────────────────────────────
const getMember: EmberlynTool = {
  name: 'get_member',
  description:
    'Look up a workspace member by name or email to get their UUID. Use this before assigning tasks — search by the name the user mentioned.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Partial or full name to search for' },
      email: { type: 'string', description: 'Exact email address to look up' },
    },
  },
  async execute(args, ctx) {
    const { name, email } = args as { name?: string; email?: string };

    if (!name && !email) {
      return { error: 'Provide at least one of: name or email.' };
    }

    const members = await ctx.prisma.workspaceMember.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        user: {
          OR: [
            ...(name ? [{ name: { contains: name, mode: 'insensitive' as const } }] : []),
            ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
          ],
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      take: 5,
    });

    if (members.length === 0) {
      return { error: `No workspace member found matching "${name ?? email}".` };
    }

    return {
      matches: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
      })),
    };
  },
};

// ─── list_teams ───────────────────────────────────────────────────────────────
const listTeams: EmberlynTool = {
  name: 'list_teams',
  description: 'List all teams in the workspace with their member counts.',
  parameters: {
    type: 'object',
    properties: {},
  },
  async execute(_args, ctx) {
    const teams = await ctx.prisma.team.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        leader: { select: { id: true, name: true } },
        _count: { select: { members: true, projects: true } },
      },
    });

    return { count: teams.length, teams };
  },
};

// ─── get_team ─────────────────────────────────────────────────────────────────
const getTeam: EmberlynTool = {
  name: 'get_team',
  description: 'Get a team\'s details including its full member list.',
  parameters: {
    type: 'object',
    properties: {
      teamId: { type: 'string', description: 'Team UUID or partial team name to search for' },
    },
    required: ['teamId'],
  },
  async execute(args, ctx) {
    const { teamId } = args as { teamId: string };

    const isUuid = /^[0-9a-f-]{36}$/.test(teamId);

    // Support lookup by name if not a UUID
    const team = isUuid
      ? await ctx.prisma.team.findFirst({
          where: { id: teamId, workspaceId: ctx.workspaceId },
          include: {
            leader: { select: { id: true, name: true } },
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            projects: {
              where: { deletedAt: null },
              select: { id: true, name: true, status: true },
              take: 10,
            },
          },
        })
      : await ctx.prisma.team.findFirst({
          where: {
            workspaceId: ctx.workspaceId,
            name: { contains: teamId, mode: 'insensitive' },
          },
          include: {
            leader: { select: { id: true, name: true } },
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            projects: {
              where: { deletedAt: null },
              select: { id: true, name: true, status: true },
              take: 10,
            },
          },
        });

    if (!team) {
      return { error: `Team "${teamId}" not found in this workspace.` };
    }

    return team;
  },
};

// ─── list_files ───────────────────────────────────────────────────────────────
const listFiles: EmberlynTool = {
  name: 'list_files',
  description: 'List files uploaded to the workspace or a specific project. Returns metadata only — no file bytes.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Scope to a specific project UUID' },
      contentType: { type: 'string', description: 'Filter by MIME type prefix (e.g. "image/", "application/pdf")' },
      limit: { type: 'number', description: 'Max results (default 20, max 50)' },
    },
  },
  async execute(args, ctx) {
    const { projectId, contentType, limit } = args as {
      projectId?: string;
      contentType?: string;
      limit?: number;
    };

    const take = Math.min(limit ?? 20, 50);

    const files = await ctx.prisma.fileRecord.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(contentType ? { contentType: { startsWith: contentType } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        filename: true,
        contentType: true,
        sizeBytes: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return {
      count: files.length,
      files: files.map((f) => ({
        ...f,
        // BigInt → string for JSON serialisation
        sizeBytes: f.sizeBytes.toString(),
      })),
    };
  },
};

// ─── get_file_info ────────────────────────────────────────────────────────────
const getFileInfo: EmberlynTool = {
  name: 'get_file_info',
  description: 'Get metadata for a specific file: name, size, type, uploader, project, and version count.',
  parameters: {
    type: 'object',
    properties: {
      fileId: { type: 'string', description: 'File record UUID' },
    },
    required: ['fileId'],
  },
  async execute(args, ctx) {
    const { fileId } = args as { fileId: string };

    const file = await ctx.prisma.fileRecord.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
      },
    });

    if (!file || file.deletedAt || file.workspaceId !== ctx.workspaceId) {
      return { error: `File "${fileId}" not found.` };
    }

    return {
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    };
  },
};

// ─── global_search ────────────────────────────────────────────────────────────
const globalSearch: EmberlynTool = {
  name: 'global_search',
  description:
    'Full-text search across all modules simultaneously: tasks, projects, wiki pages, and files. Use this when the user asks a broad question like "find everything about X" or "search for Y across the workspace".',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query text (required)' },
      limit: { type: 'number', description: 'Max results per entity type (default 5, max 10)' },
    },
    required: ['query'],
  },
  async execute(args, ctx) {
    const { query, limit } = args as { query: string; limit?: number };
    const take = Math.min(limit ?? 5, 10);

    const [tasks, projects, wikiPages, files] = await Promise.all([
      ctx.prisma.task.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take,
        select: {
          id: true, identifier: true, title: true, status: true, priority: true,
          project: { select: { name: true } },
        },
      }),
      ctx.prisma.project.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take,
        select: { id: true, identifier: true, name: true, status: true },
      }),
      ctx.prisma.wikiPage.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          title: { contains: query, mode: 'insensitive' },
        },
        take,
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
      ctx.prisma.fileRecord.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          deletedAt: null,
          filename: { contains: query, mode: 'insensitive' },
        },
        take,
        select: { id: true, filename: true, contentType: true, createdAt: true },
      }),
    ]);

    return {
      query,
      results: {
        tasks: { count: tasks.length, items: tasks },
        projects: { count: projects.length, items: projects },
        wiki: { count: wikiPages.length, items: wikiPages },
        files: { count: files.length, items: files },
      },
      totalHits: tasks.length + projects.length + wikiPages.length + files.length,
    };
  },
};

export const workspaceTools: EmberlynTool[] = [
  listWorkspaceMembers,
  getMember,
  listTeams,
  getTeam,
  listFiles,
  getFileInfo,
  globalSearch,
];
