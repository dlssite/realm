import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/:workspaceId/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length === 0) {
      return reply.send({ tasks: [], projects: [], wikiPages: [] });
    }

    const query = q.trim();

    const [tasks, projects, wikiPages] = await Promise.all([
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { identifier: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, title: true, identifier: true, status: true },
      }),
      prisma.project.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { identifier: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, identifier: true, status: true },
      }),
      prisma.wikiPage.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, title: true, slug: true },
      }),
    ]);

    return reply.send({
      tasks,
      projects,
      wikiPages,
    });
  });
}
