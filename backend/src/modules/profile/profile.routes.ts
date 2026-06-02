import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { ProfileController } from './profile.controller.js';
import { ProfileRepository } from './profile.repository.js';
import { ProfileService } from './profile.service.js';
import {
  profileResponseSchema,
  profileSchema,
  saveProfileSchema,
} from './profile.schemas.js';

export const profileRoutes: FastifyPluginAsyncZod = async (router) => {
  const controller = new ProfileController(new ProfileService(new ProfileRepository(db)));

  router.addHook('preHandler', authenticate);

  router.get(
    '/',
    {
      schema: {
        response: { 200: profileResponseSchema },
      },
    },
    controller.get,
  );

  router.put(
    '/',
    {
      schema: {
        body: saveProfileSchema,
        response: { 200: profileSchema },
      },
    },
    controller.save,
  );
};
