import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { SettingsRepository } from '../settings/settings.repository.js';
import { SettingsService } from '../settings/settings.service.js';
import { EmailSyncController } from './email-sync.controller.js';
import { EmailSyncRepository } from './email-sync.repository.js';
import { EmailSyncService } from './email-sync.service.js';
import { EmailTriageService } from './email-triage.js';
import { GmailFetcher } from './gmail.fetcher.js';
import {
  emailMatchListSchema,
  emailMatchSchema,
  listMatchesQuerySchema,
  matchIdParamSchema,
  syncResultSchema,
} from './email-sync.schemas.js';

export const emailSyncRoutes: FastifyPluginAsyncZod = async (router) => {
  const repo = new EmailSyncRepository(db);
  const service = new EmailSyncService(repo);
  const settingsService = new SettingsService(new SettingsRepository(db));
  const triage = new EmailTriageService(service, settingsService);
  const fetcher = new GmailFetcher(service);
  const controller = new EmailSyncController(service, fetcher, triage);

  // OAuth callback does not require authentication (Google redirects back unauthenticated)
  router.get(
    '/oauth/callback',
    {
      schema: {
        querystring: z.object({
          code: z.string().optional(),
          state: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    controller.handleCallback,
  );

  router.addHook('preHandler', authenticate);

  router.get(
    '/oauth/url',
    { schema: { response: { 200: z.object({ url: z.string() }) } } },
    controller.getOAuthUrl,
  );

  router.get('/status', {}, controller.getStatus);

  router.delete('/connection', { schema: { response: { 204: z.void() } } }, controller.disconnect);

  router.post(
    '/sync',
    {
      schema: {
        querystring: z.object({ days: z.coerce.number().int().min(1).max(90).optional() }),
        response: { 200: syncResultSchema },
      },
    },
    controller.triggerSync,
  );

  router.get(
    '/matches',
    {
      schema: {
        querystring: listMatchesQuerySchema,
        response: { 200: emailMatchListSchema },
      },
    },
    controller.listMatches,
  );

  router.patch(
    '/matches/:id/confirm',
    {
      schema: {
        params: matchIdParamSchema,
        response: { 200: emailMatchSchema },
      },
    },
    controller.confirmMatch,
  );

  router.patch(
    '/matches/:id/dismiss',
    {
      schema: {
        params: matchIdParamSchema,
        response: { 200: emailMatchSchema },
      },
    },
    controller.dismissMatch,
  );
};
