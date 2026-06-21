import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate, requireUser } from '../../middleware/auth-guard.js';
import { SettingsRepository } from '../settings/settings.repository.js';
import { SettingsService } from '../settings/settings.service.js';
import { ProfileRepository } from '../profile/profile.repository.js';
import { JobScoutService } from './job-scout.service.js';
import {
  searchQuerySchema,
  fetchAndScoreSchema,
  searchResponseSchema,
  fetchAndScoreResponseSchema,
} from './job-scout.schemas.js';

export const jobScoutRoutes: FastifyPluginAsyncZod = async (router) => {
  const service = new JobScoutService(
    new SettingsService(new SettingsRepository(db)),
    new ProfileRepository(db),
  );

  router.addHook('preHandler', authenticate);

  router.post(
    '/search',
    {
      schema: {
        body: searchQuerySchema,
        response: { 200: searchResponseSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const result = await service.search(user.id, request.body.query);
      return reply.send(result);
    },
  );

  router.post(
    '/fetch-and-score',
    {
      schema: {
        body: fetchAndScoreSchema,
        response: { 200: fetchAndScoreResponseSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const result = await service.fetchAndScore(user.id, request.body.url);
      return reply.send(result);
    },
  );
};
