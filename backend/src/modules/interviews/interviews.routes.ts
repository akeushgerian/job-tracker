import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { InterviewsController } from './interviews.controller.js';
import { InterviewsRepository } from './interviews.repository.js';
import { InterviewsService } from './interviews.service.js';
import {
  applicationIdParamSchema,
  createInterviewSchema,
  idParamSchema,
  interviewListSchema,
  interviewSchema,
  updateInterviewSchema,
} from './interviews.schemas.js';

export const interviewsRoutes: FastifyPluginAsyncZod = async (router) => {
  const controller = new InterviewsController(
    new InterviewsService(db, new InterviewsRepository(db)),
  );
  router.addHook('preHandler', authenticate);

  router.get(
    '/applications/:applicationId/interviews',
    {
      schema: {
        params: applicationIdParamSchema,
        response: { 200: interviewListSchema },
      },
    },
    controller.list,
  );

  router.post(
    '/applications/:applicationId/interviews',
    {
      schema: {
        params: applicationIdParamSchema,
        body: createInterviewSchema,
        response: { 201: interviewSchema },
      },
    },
    controller.create,
  );

  router.get(
    '/interviews/:id',
    { schema: { params: idParamSchema, response: { 200: interviewSchema } } },
    controller.getById,
  );

  router.patch(
    '/interviews/:id',
    {
      schema: {
        params: idParamSchema,
        body: updateInterviewSchema,
        response: { 200: interviewSchema },
      },
    },
    controller.update,
  );

  router.delete(
    '/interviews/:id',
    { schema: { params: idParamSchema } },
    controller.remove,
  );
};
