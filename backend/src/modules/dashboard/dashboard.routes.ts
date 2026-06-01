import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate, requireUser } from '../../middleware/auth-guard.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';
import { dashboardStatsSchema } from './dashboard.schemas.js';

export const dashboardRoutes: FastifyPluginAsyncZod = async (router) => {
  const service = new DashboardService(new DashboardRepository(db));
  router.addHook('preHandler', authenticate);

  router.get(
    '/stats',
    { schema: { response: { 200: dashboardStatsSchema } } },
    async (request, reply) => {
      const user = requireUser(request);
      const stats = await service.getStats(user.id);
      return reply.status(200).send(stats);
    },
  );
};
