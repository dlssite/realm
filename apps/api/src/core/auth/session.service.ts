import crypto from 'node:crypto';
import { prisma } from '../../infrastructure/database/prisma';

export interface SessionData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

export class SessionService {
  private static SESSION_DURATION_DAYS = 30;

  /**
   * Creates a database-backed user session.
   */
  static async createSession(userId: string): Promise<string> {
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_DURATION_DAYS);

    await prisma.session.create({
      data: {
        id,
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validates a session token, returning the user and session data.
   */
  static async validateSession(token: string): Promise<SessionData | null> {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session) return null;

    // Check if session has expired or user is soft deleted
    if (session.expiresAt < new Date() || session.user.deletedAt !== null) {
      await this.destroySession(token);
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatarUrl: session.user.avatarUrl,
      },
    };
  }

  /**
   * Destroys an active session.
   */
  static async destroySession(token: string): Promise<void> {
    await prisma.session.delete({
      where: { token },
    }).catch(() => {
      // Ignore if session already deleted
    });
  }
}
