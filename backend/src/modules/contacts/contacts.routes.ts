import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { ContactsController } from './contacts.controller.js';
import { ContactsRepository } from './contacts.repository.js';
import { ContactsService } from './contacts.service.js';
import {
  applicationIdParamSchema,
  contactListSchema,
  contactSchema,
  createContactSchema,
  idParamSchema,
  updateContactSchema,
} from './contacts.schemas.js';

export const contactsRoutes: FastifyPluginAsyncZod = async (router) => {
  const controller = new ContactsController(
    new ContactsService(db, new ContactsRepository(db)),
  );
  router.addHook('preHandler', authenticate);

  router.get(
    '/applications/:applicationId/contacts',
    { schema: { params: applicationIdParamSchema, response: { 200: contactListSchema } } },
    controller.list,
  );

  router.post(
    '/applications/:applicationId/contacts',
    {
      schema: {
        params: applicationIdParamSchema,
        body: createContactSchema,
        response: { 201: contactSchema },
      },
    },
    controller.create,
  );

  router.get(
    '/contacts/:id',
    { schema: { params: idParamSchema, response: { 200: contactSchema } } },
    controller.getById,
  );

  router.patch(
    '/contacts/:id',
    {
      schema: {
        params: idParamSchema,
        body: updateContactSchema,
        response: { 200: contactSchema },
      },
    },
    controller.update,
  );

  router.delete(
    '/contacts/:id',
    { schema: { params: idParamSchema } },
    controller.remove,
  );
};
