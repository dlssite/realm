import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { SessionService } from '../../core/auth/session.service';

const authPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Helper to extract session token from cookies or headers
  const getSessionToken = (request: FastifyRequest): string | null => {
    // 1. Try Authorization header
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Try Cookies
    const cookieHeader = request.headers['cookie'];
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((cookie) => {
          const parts = cookie.split('=');
          return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
        })
      );
      return cookies['realm_session'] || null;
    }

    return null;
  };

  // Decorate fastify request with session & user objects
  fastify.decorateRequest('session', null);
  fastify.decorateRequest('user', null);

  // Global request parsing hook to load session if present
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const token = getSessionToken(request);
    if (token) {
      const session = await SessionService.validateSession(token);
      if (session) {
        request.session = session;
        request.user = session.user;
      }
    }
  });

  // Decorate fastify instance with authenticate validation hook
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.session || !request.user) {
        reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Session is invalid or expired',
          },
        });
      }
    }
  );
};

export const authPlugin = fp(authPluginAsync, {
  name: 'realm-auth',
});
