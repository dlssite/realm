import { EmberlynTool } from '../tool-context';

// ─── search_wiki ──────────────────────────────────────────────────────────────
const searchWiki: EmberlynTool = {
  name: 'search_wiki',
  description: 'Full-text search across wiki pages in the workspace. Returns matching page titles, slugs, and a content snippet.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Text to search for in page titles and content' },
      projectId: { type: 'string', description: 'Scope search to a specific project UUID' },
      limit: { type: 'number', description: 'Max results (default 10, max 25)' },
    },
    required: ['query'],
  },
  async execute(args, ctx) {
    const { query, projectId, limit } = args as {
      query: string;
      projectId?: string;
      limit?: number;
    };

    const take = Math.min(limit ?? 10, 25);

    const pages = await ctx.prisma.wikiPage.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        isPublished: true,
        ...(projectId ? { projectId } : {}),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          {
            versions: {
              some: {
                // Search within the latest version's content if it's stored as text
                changeSummary: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { versions: true, children: true } },
      },
    });

    return { count: pages.length, pages };
  },
};

// ─── get_wiki_page ────────────────────────────────────────────────────────────
const getWikiPage: EmberlynTool = {
  name: 'get_wiki_page',
  description:
    'Read the full content of a wiki page, including its TipTap JSON content and version history summary. Use this before summarizing or referencing a wiki page.',
  parameters: {
    type: 'object',
    properties: {
      pageId: { type: 'string', description: 'Wiki page UUID' },
    },
    required: ['pageId'],
  },
  async execute(args, ctx) {
    const { pageId } = args as { pageId: string };

    const page = await ctx.prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: {
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        parent: { select: { id: true, title: true, slug: true } },
        children: {
          where: { deletedAt: null },
          select: { id: true, title: true, slug: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            content: true,
            createdAt: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });

    if (!page || page.deletedAt || page.workspaceId !== ctx.workspaceId) {
      return { error: `Wiki page "${pageId}" not found.` };
    }

    return page;
  },
};

// ─── list_wiki_pages ──────────────────────────────────────────────────────────
const listWikiPages: EmberlynTool = {
  name: 'list_wiki_pages',
  description: 'List top-level wiki pages in the workspace or a specific project. Returns the page tree structure.',
  parameters: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Scope to a specific project UUID' },
      includeChildren: {
        type: 'boolean',
        description: 'Whether to include child pages (default false)',
      },
    },
  },
  async execute(args, ctx) {
    const { projectId, includeChildren } = args as {
      projectId?: string;
      includeChildren?: boolean;
    };

    const pages = await ctx.prisma.wikiPage.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        deletedAt: null,
        parentId: null, // top-level only
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      ...(includeChildren
        ? {
            include: {
              children: {
                where: { deletedAt: null },
                select: { id: true, title: true, slug: true, updatedAt: true },
              },
            },
          }
        : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        isPublished: true,
        updatedAt: true,
        project: { select: { id: true, name: true } },
        _count: { select: { children: true } },
      },
    });

    return { count: pages.length, pages };
  },
};

// ─── create_wiki_page ─────────────────────────────────────────────────────────
const createWikiPage: EmberlynTool = {
  name: 'create_wiki_page',
  description: 'Create a new wiki page. Content should be plain text; it will be stored as a TipTap document.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Page title (required)' },
      content: { type: 'string', description: 'Initial page content as plain text' },
      parentId: { type: 'string', description: 'UUID of a parent page to nest this under' },
      projectId: { type: 'string', description: 'UUID of the project this page belongs to' },
    },
    required: ['title'],
  },
  async execute(args, ctx) {
    const { title, content, parentId, projectId } = args as {
      title: string;
      content?: string;
      parentId?: string;
      projectId?: string;
    };

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 200);

    // Build TipTap-compatible document structure from plain text
    const tipTapContent = content
      ? {
          type: 'doc',
          content: content.split('\n\n').map((para) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: para }],
          })),
        }
      : { type: 'doc', content: [] };

    const page = await ctx.prisma.wikiPage.create({
      data: {
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
        title,
        slug,
        isPublished: true,
        parentId: parentId ?? null,
        projectId: projectId ?? null,
        versions: {
          create: {
            createdById: ctx.userId,
            title,
            content: tipTapContent,
            versionNumber: 1,
            changeSummary: 'Created by Emberlyn',
          },
        },
      },
      select: { id: true, title: true, slug: true, createdAt: true },
    });

    return { success: true, page };
  },
};

// ─── update_wiki_page ─────────────────────────────────────────────────────────
const updateWikiPage: EmberlynTool = {
  name: 'update_wiki_page',
  description: 'Update a wiki page\'s title or content and create a new version snapshot.',
  parameters: {
    type: 'object',
    properties: {
      pageId: { type: 'string', description: 'Wiki page UUID' },
      title: { type: 'string', description: 'New title' },
      content: { type: 'string', description: 'New content as plain text' },
    },
    required: ['pageId'],
  },
  async execute(args, ctx) {
    const { pageId, title, content } = args as {
      pageId: string;
      title?: string;
      content?: string;
    };

    const existing = await ctx.prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { versionNumber: true } },
      },
    });

    if (!existing || existing.deletedAt || existing.workspaceId !== ctx.workspaceId) {
      return { error: `Wiki page "${pageId}" not found.` };
    }

    const nextVersion = (existing.versions[0]?.versionNumber ?? 0) + 1;
    const newTitle = title ?? existing.title;

    const tipTapContent = content
      ? {
          type: 'doc',
          content: content.split('\n\n').map((para) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: para }],
          })),
        }
      : undefined;

    await ctx.prisma.wikiPage.update({
      where: { id: pageId },
      data: {
        ...(title ? { title: newTitle } : {}),
        versions: {
          create: {
            createdById: ctx.userId,
            title: newTitle,
            ...(tipTapContent ? { content: tipTapContent } : {}),
            versionNumber: nextVersion,
            changeSummary: 'Updated by Emberlyn',
          },
        },
      },
    });

    return { success: true, pageId, versionNumber: nextVersion };
  },
};

export const wikiTools: EmberlynTool[] = [
  searchWiki,
  getWikiPage,
  listWikiPages,
  createWikiPage,
  updateWikiPage,
];
