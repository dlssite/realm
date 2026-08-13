import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database/prisma';
import { Prisma } from '@prisma/client';
import { PasswordService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';
import { slugify } from '@realm/utils';
import { NotificationService } from '../../core/notifications/notification.service';

// Validation schemas
const acceptInviteSchema = z.discriminatedUnion('action', [
  // Already-authenticated user: token validated via Bearer header
  z.object({
    action: z.literal('authenticated'),
  }),
  // Existing user: sign in and accept
  z.object({
    action: z.literal('login'),
    email: z.string().email().transform((e) => e.toLowerCase()),
    password: z.string(),
  }),
  // New user: register and accept
  z.object({
    action: z.literal('register'),
    name: z.string().min(1).max(100),
    email: z.string().email().transform((e) => e.toLowerCase()),
    password: z.string().min(8).max(100),
  }),
]);

export async function invitationRoutes(fastify: FastifyInstance) {
  // NOTE: No global authenticate hook here — these are public endpoints.

  // GET /api/v1/invitations/:token
  // Look up an invitation by token. Returns workspace/role info so the
  // frontend can render the invite acceptance page before the user logs in.
  fastify.get(
    '/:token',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };

      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      });

      if (!invitation) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Invitation not found or has already been used' },
        });
      }

      if (invitation.acceptedAt) {
        return reply.status(410).send({
          error: { code: 'GONE', message: 'This invitation has already been accepted' },
        });
      }

      if (new Date() > invitation.expiresAt) {
        return reply.status(410).send({
          error: { code: 'GONE', message: 'This invitation has expired' },
        });
      }

      return reply.send({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        workspace: invitation.workspace,
      });
    }
  );

  // POST /api/v1/invitations/:token/accept
  // Accept an invitation. Supports two flows:
  //   { action: 'login',    email, password }      — existing user
  //   { action: 'register', name, email, password } — new user (no workspace creation)
  fastify.post(
    '/:token/accept',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };

      // 1. Validate the token
      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      });

      if (!invitation) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Invitation not found or has already been used' },
        });
      }

      if (invitation.acceptedAt) {
        return reply.status(410).send({
          error: { code: 'GONE', message: 'This invitation has already been accepted' },
        });
      }

      if (new Date() > invitation.expiresAt) {
        return reply.status(410).send({
          error: { code: 'GONE', message: 'This invitation has expired' },
        });
      }

      // 2. Parse and validate the action body
      const parseResult = acceptInviteSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const body = parseResult.data;
      let userId: string;
      let sessionToken: string | undefined;

      if (body.action === 'authenticated') {
        // -- Already logged-in user flow --
        // Validate the Bearer token they sent to confirm their identity
        const authHeader = (request.headers['authorization'] as string | undefined) ?? '';
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!bearerToken) {
          return reply.status(401).send({
            error: { code: 'UNAUTHORIZED', message: 'No session token provided' },
          });
        }

        const session = await SessionService.validateSession(bearerToken);
        if (!session) {
          return reply.status(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Session is invalid or expired' },
          });
        }

        // Enforce that the session user's email matches the invite
        if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: `This invitation was sent to ${invitation.email}. You are signed in as ${session.user.email}.`,
            },
          });
        }

        userId = session.user.id;
        sessionToken = bearerToken; // reuse existing session — no new token needed
      } else if (body.action === 'login') {
        // -- Existing user flow --
        const user = await prisma.user.findFirst({
          where: { email: body.email, deletedAt: null },
        });

        if (!user) {
          return reply.status(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
          });
        }

        const passwordMatch = await PasswordService.verify(body.password, user.passwordHash);
        if (!passwordMatch) {
          return reply.status(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
          });
        }

        // Enforce that the logged-in email matches the invite email
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: `This invitation was sent to ${invitation.email}. Please sign in with that account.`,
            },
          });
        }

        userId = user.id;
      } else {
        // -- New user registration flow --

        // Enforce email matches the invite
        if (body.email.toLowerCase() !== invitation.email.toLowerCase()) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: `This invitation was sent to ${invitation.email}. Please register with that email address.`,
            },
          });
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existingUser) {
          return reply.status(409).send({
            error: {
              code: 'CONFLICT',
              message: 'An account with this email already exists. Please use the "Sign in" option instead.',
            },
          });
        }

        const passwordHash = await PasswordService.hash(body.password);
        const newUser = await prisma.user.create({
          data: { email: body.email, name: body.name, passwordHash },
        });
        userId = newUser.id;
      }

      // 3. Add to workspace (idempotent — upsert so double-clicks are safe)
      const existingMembership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
      });

      if (!existingMembership) {
        await prisma.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
          },
        });
      }

      // 4. Mark invitation accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // ── Notifications ──────────────────────────────────────────────────────
      // Fetch the new member's name (exists for login/authenticated; just joined for register)
      const newMemberUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const newMemberName = newMemberUser?.name ?? invitation.email;
      const workspaceId   = invitation.workspaceId;

      // 4a. Tell the new member they've joined
      await NotificationService.send({
        recipientId:  userId,
        workspaceId,
        type:         'WORKSPACE_INVITED',
        title:        `Welcome to ${invitation.workspace.name}!`,
        body:         `You joined as ${invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}.`,
        entityType:   'WORKSPACE',
        entityId:     workspaceId,
        entityTitle:  invitation.workspace.name,
      });

      // 4b. Notify every OWNER and ADMIN that a new member joined
      const admins = await prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: ['OWNER', 'ADMIN'] },
          userId: { not: userId },          // don't notify the joiner themselves
        },
        select: { userId: true },
      });

      await Promise.all(
        admins.map(({ userId: adminId }) =>
          NotificationService.send({
            recipientId:  adminId,
            workspaceId,
            type:         'WORKSPACE_INVITED',
            title:        `${newMemberName} joined ${invitation.workspace.name}`,
            body:         `Joined as ${invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()} via invite.`,
            entityType:   'WORKSPACE',
            entityId:     workspaceId,
            entityTitle:  invitation.workspace.name,
            actorId:      userId,
            actorName:    newMemberName,
          })
        )
      );

      // 5. Create or reuse session, then return auth data
      // For 'authenticated' action, sessionToken was already set to the Bearer token above.
      // For login/register, create a fresh session now.
      if (!sessionToken) {
        sessionToken = await SessionService.createSession(userId);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      reply.header(
        'Set-Cookie',
        `realm_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
      );

      return reply.status(200).send({
        user,
        workspace: {
          id: invitation.workspace.id,
          name: invitation.workspace.name,
          slug: invitation.workspace.slug,
          role: existingMembership ? existingMembership.role : invitation.role,
        },
        token: sessionToken,
      });
    }
  );

  // DELETE /api/v1/invitations/:token/decline
  // Decline an invitation — deletes the record so the person must be re-invited.
  // Public: no authentication required (the token IS the credential).
  fastify.delete(
    '/:token/decline',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };

      const invitation = await prisma.invitation.findUnique({ where: { token } });

      if (!invitation) {
        // Already gone — treat as success so double-clicks don't error
        return reply.status(204).send();
      }

      if (invitation.acceptedAt) {
        return reply.status(410).send({
          error: { code: 'GONE', message: 'This invitation has already been accepted and cannot be declined' },
        });
      }

      await prisma.invitation.delete({ where: { token } });
      return reply.status(204).send();
    }
  );
}
