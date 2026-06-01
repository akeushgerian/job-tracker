import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { FollowUpsController } from './follow-ups.controller.js';
import { FollowUpsRepository } from './follow-ups.repository.js';
import { FollowUpsService } from './follow-ups.service.js';
import {
  applicationIdParamSchema,
  createFollowUpSchema,
  followUpListSchema,
  followUpSchema,
  idParamSchema,
  updateFollowUpSchema,
} from './follow-ups.schemas.js';

export const followUpsRoutes: FastifyPluginAsyncZod = async (router) => {
  const controller = new FollowUpsController(
    new FollowUpsService(db, new FollowUpsRepository(db)),
  );
  router.addHook('preHandler', authenticate);

  router.get(
    '/applications/:applicationId/follow-ups',
    {
      schema: {
        params: applicationIdParamSchema,
        response: { 200: followUpListSchema },
      },
    },
    controller.list,
  );

  router.post(
    '/applications/:applicationId/follow-ups',
    {
      schema: {
        params: applicationIdParamSchema,
        body: createFollowUpSchema,
        response: { 201: followUpSchema },
      },
    },
    controller.create,
  );

  router.get(
    '/follow-ups/:id',
    { schema: { params: idParamSchema, response: { 200: followUpSchema } } },
    controller.getById,
  );

  router.patch(
    '/follow-ups/:id',
    {
      schema: {
        params: idParamSchema,
        body: updateFollowUpSchema,
        response: { 200: followUpSchema },
      },
    },
    controller.update,
  );

  router.delete(
    '/follow-ups/:id',
    { schema: { params: idParamSchema } },
    controller.remove,
  );
};
