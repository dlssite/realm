import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { PermissionService, ResourceName, ActionName } from '../../core/permissions/permission.service';

const permissionPluginAsync: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate(
    'authorize',
    (resource: ResourceName, action: ActionName) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        // Resolve active workspace ID
        const params = request.params as Record<string, string>;
        const workspaceId = params['workspaceId'] || (request.headers['x-workspace-id'] as string);

        if (!workspaceId) {
          return reply.status(400).send({
            error: {
              code: 'WORKSPACE_REQUIRED',
              message: 'Workspace identifier must be provided in URL parameters or X-Workspace-Id header',
            },
          });
        }

        // Authenticated user check
        const userId = request.user?.id;
        if (!userId) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Session is invalid or expired',
            },
          });
        }

        // Evaluate permission
        const isAuthorized = await PermissionService.check(userId, workspaceId, resource, action);

        if (!isAuthorized) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: `You lack the '${action}' permission on resource '${resource}'`,
            },
          });
        }
      };
    }
  );
};

export const permissionPlugin = fp(permissionPluginAsync, {
  name: 'realm-permission',
  dependencies: ['realm-auth'],
});
