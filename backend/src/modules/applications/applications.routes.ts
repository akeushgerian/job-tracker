import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsRepository } from './applications.repository.js';
import { ApplicationsService } from './applications.service.js';
import {
  applicationSchema,
  createApplicationSchema,
  idParamSchema,
  listApplicationsQuerySchema,
  paginatedApplicationsSchema,
  updateApplicationSchema,
  updateStatusSchema,
} from './applications.schemas.js';

export const applicationsRoutes: FastifyPluginAsyncZod = async (router) => {
  const controller = new ApplicationsController(
    new ApplicationsService(new ApplicationsRepository(db)),
  );

  // Every route in this module requires authentication.
  router.addHook('preHandler', authenticate);

  router.post(
    '/',
    {
      schema: {
        body: createApplicationSchema,
        response: { 201: applicationSchema },
      },
    },
    controller.create,
  );

  router.get(
    '/',
    {
      schema: {
        querystring: listApplicationsQuerySchema,
        response: { 200: paginatedApplicationsSchema },
      },
    },
    controller.list,
  );

  router.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
        response: { 200: applicationSchema },
      },
    },
    controller.getById,
  );

  router.patch(
    '/:id',
    {
      schema: {
        params: idParamSchema,
        body: updateApplicationSchema,
        response: { 200: applicationSchema },
      },
    },
    controller.update,
  );

  router.patch(
    '/:id/status',
    {
      schema: {
        params: idParamSchema,
        body: updateStatusSchema,
        response: { 200: applicationSchema },
      },
    },
    controller.changeStatus,
  );

  router.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    controller.remove,
  );
};
