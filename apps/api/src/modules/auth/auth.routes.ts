import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';
import { PasswordService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { slugify } from '@realm/utils';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  workspaceName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration input',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { email, name, password, workspaceName } = parseResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(409).send({
        error: {
          code: 'CONFLICT',
          message: 'User with this email already exists',
        },
      });
    }

    // Hash password and perform transactional creation
    const passwordHash = await PasswordService.hash(password);
    const slug = slugify(workspaceName);

    // Generate unique slug by suffixing if conflict
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
        },
      });

      // 2. Create Workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: uniqueSlug,
          createdById: user.id,
        },
      });

      // 3. Create Workspace Member as OWNER
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { user, workspace };
    });

    // Create session and login
    const token = await SessionService.createSession(result.user.id);

    // Set cookie
    reply.header(
      'Set-Cookie',
      `realm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    );

    return reply.status(201).send({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
      },
      token,
    });
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login credentials structure',
        },
      });
    }

    const { email, password } = parseResult.data;

    // Find active user
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
    }

    // Verify password
    const passwordMatch = await PasswordService.verify(password, user.passwordHash);
    if (!passwordMatch) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      });
    }

    // Find default/first workspace membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });

    const token = await SessionService.createSession(user.id);

    reply.header(
      'Set-Cookie',
      `realm_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
    );

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      workspace: membership
        ? {
            id: membership.workspace.id,
            name: membership.workspace.name,
            slug: membership.workspace.slug,
          }
        : null,
      token,
    });
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.session) {
      await SessionService.destroySession(request.session.token);
    }

    reply.header('Set-Cookie', 'realm_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return reply.send({ success: true });
  });

  // GET /api/v1/auth/me
  fastify.get(
    '/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workspaceId } = request.query as { workspaceId?: string };

      // If the client passes a specific workspaceId (last active workspace),
      // try to restore that one — but only if the user is actually a member.
      // Fall back to the first membership if the ID is missing or invalid.
      const membership = workspaceId
        ? await prisma.workspaceMember.findFirst({
            where: { userId: request.user!.id, workspaceId },
            include: { workspace: true },
          }) ?? await prisma.workspaceMember.findFirst({
            where: { userId: request.user!.id },
            include: { workspace: true },
          })
        : await prisma.workspaceMember.findFirst({
            where: { userId: request.user!.id },
            include: { workspace: true },
          });

      return reply.send({
        user: request.user,
        workspace: membership
          ? {
              id: membership.workspace.id,
              name: membership.workspace.name,
              slug: membership.workspace.slug,
              role: membership.role,
            }
          : null,
      });
    }
  );
}
