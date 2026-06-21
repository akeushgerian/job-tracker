import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { applicationsRoutes } from './modules/applications/applications.routes.js';
import { interviewsRoutes } from './modules/interviews/interviews.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { followUpsRoutes } from './modules/follow-ups/follow-ups.routes.js';
import { activitiesRoutes } from './modules/activities/activities.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { assistantRoutes } from './modules/assistant/assistant.routes.js';
import { profileRoutes } from './modules/profile/profile.routes.js';
import { coverLettersRoutes } from './modules/cover-letters/cover-letters.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { emailSyncRoutes } from './modules/email-sync/email-sync.routes.js';
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { jobScoutRoutes } from './modules/job-scout/job-scout.routes.js';
import { startPoller } from './modules/email-sync/email-sync.poller.js';
import './types/auth.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            transport:
              config.NODE_ENV === 'development'
                ? { target: 'pino-pretty' }
                : undefined,
          },
    disableRequestLogging: false,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  await app.register(cookie);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(applicationsRoutes, { prefix: '/api/applications' });
  await app.register(interviewsRoutes, { prefix: '/api' });
  await app.register(contactsRoutes, { prefix: '/api' });
  await app.register(followUpsRoutes, { prefix: '/api' });
  await app.register(activitiesRoutes, { prefix: '/api' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(assistantRoutes, { prefix: '/api/assistant' });
  await app.register(profileRoutes, { prefix: '/api/profile' });
  await app.register(coverLettersRoutes, { prefix: '/api' });
  await app.register(emailSyncRoutes, { prefix: '/api/email-sync' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(jobScoutRoutes, { prefix: '/api/job-scout' });

  if (process.env.GOOGLE_CLIENT_ID) {
    void Promise.resolve(app.ready()).then(() => startPoller(app)).catch((err: unknown) => {
      app.log.error({ err }, 'Failed to start Gmail poller');
    });
  }

  return app;
}
