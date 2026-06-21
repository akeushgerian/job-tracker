import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { SettingsController } from './settings.controller.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';
import { aiSettingsSchema, updateAiSettingsSchema } from './settings.schemas.js';

export const settingsRoutes: FastifyPluginAsyncZod = async (router) => {
  const controller = new SettingsController(
    new SettingsService(new SettingsRepository(db)),
  );

  router.addHook('preHandler', authenticate);

  router.get(
    '/ai',
    {
      schema: {
        response: { 200: z.union([aiSettingsSchema, z.null()]) },
      },
    },
    controller.getAiSettings,
  );

  router.put(
    '/ai',
    {
      schema: {
        body: updateAiSettingsSchema,
        response: { 200: aiSettingsSchema },
      },
    },
    controller.updateAiSettings,
  );
};
