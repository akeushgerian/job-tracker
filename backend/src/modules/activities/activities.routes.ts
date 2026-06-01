import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate, requireUser } from '../../middleware/auth-guard.js';
import { ActivitiesRepository } from './activities.repository.js';
import { ActivitiesService } from './activities.service.js';
import {
  activityListSchema,
  activitySchema,
  applicationIdParamSchema,
  createActivitySchema,
} from './activities.schemas.js';

export const activitiesRoutes: FastifyPluginAsyncZod = async (router) => {
  const service = new ActivitiesService(db, new ActivitiesRepository(db));
  router.addHook('preHandler', authenticate);

  router.get(
    '/applications/:applicationId/activities',
    {
      schema: {
        params: applicationIdParamSchema,
        response: { 200: activityListSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const activities = await service.listForApplication(
        user.id,
        request.params.applicationId,
      );
      return reply.status(200).send(activities);
    },
  );

  router.post(
    '/applications/:applicationId/activities',
    {
      schema: {
        params: applicationIdParamSchema,
        body: createActivitySchema,
        response: { 201: activitySchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const created = await service.create(
        user.id,
        request.params.applicationId,
        request.body,
      );
      return reply.status(201).send(created);
    },
  );
};
