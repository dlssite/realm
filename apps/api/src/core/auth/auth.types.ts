import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionData } from './session.service';
import { ResourceName, ActionName } from '../permissions/permission.service';

declare module 'fastify' {
  interface FastifyRequest {
    session?: SessionData;
    user?: SessionData['user'];
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (resource: ResourceName, action: ActionName) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
