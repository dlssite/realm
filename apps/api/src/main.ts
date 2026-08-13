import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './app/plugins/auth.plugin';
import { permissionPlugin } from './app/plugins/permission.plugin';
import { authRoutes } from './modules/auth/auth.routes';
import { workspaceRoutes } from './modules/workspace/workspace.routes';
import { invitationRoutes } from './modules/workspace/invitation.routes';
import { projectRoutes } from './modules/projects/project.routes';
import { taskRoutes } from './modules/tasks/task.routes';
import { wikiRoutes } from './modules/wiki/wiki.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { searchRoutes } from './modules/search/search.routes';
import { websocketPlugin } from './app/plugins/websocket.plugin';
import { chatRoutes } from './modules/chat/chat.routes';
import { userRoutes } from './modules/users/user.routes';
import { fileRoutes } from './modules/files/file.routes';
import { calendarRoutes } from './modules/calendar/calendar.routes';
import { activityRoutes } from './modules/activity/activity.routes';
import { notificationRoutes } from './modules/notifications/notification.routes';

const fastify = Fastify({
  logger: true,
});

async function bootstrap() {
  try {
    // 1. Enable CORS
    await fastify.register(cors, {
      origin: process.env.VITE_APP_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // 2. Register Authentication & WebSocket Plugins
    await fastify.register(authPlugin);
    await fastify.register(permissionPlugin);
    await fastify.register(websocketPlugin);

    // 3. Register Routes
    await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
    await fastify.register(workspaceRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(invitationRoutes, { prefix: '/api/v1/invitations' });
    await fastify.register(projectRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(taskRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(wikiRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(aiRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(searchRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(chatRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(userRoutes, { prefix: '/api/v1/users' });
    await fastify.register(fileRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(calendarRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(activityRoutes, { prefix: '/api/v1/workspaces' });
    await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });

    // Health check endpoint
    fastify.get('/api/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    const port = Number(process.env.API_PORT) || 4000;
    const host = process.env.API_HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`🚀 API Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
