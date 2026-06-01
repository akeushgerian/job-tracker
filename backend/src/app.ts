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
import { healthRoutes } from './modules/health/health.routes.js';
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

  return app;
}
