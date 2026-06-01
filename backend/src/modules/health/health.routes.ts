import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client.js';

const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  uptime: z.number(),
  database: z.enum(['up', 'down']),
});

export const healthRoutes: FastifyPluginAsyncZod = async (router) => {
  router.get(
    '/health',
    { schema: { response: { 200: healthSchema, 503: healthSchema } } },
    async (_request, reply) => {
      let database: 'up' | 'down' = 'up';
      try {
        await db.execute(sql`select 1`);
      } catch {
        database = 'down';
      }

      const body = {
        status: database === 'up' ? ('ok' as const) : ('degraded' as const),
        uptime: process.uptime(),
        database,
      };
      return reply.status(database === 'up' ? 200 : 503).send(body);
    },
  );
};
