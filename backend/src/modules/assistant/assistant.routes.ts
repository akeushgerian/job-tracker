import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate, requireUser } from '../../middleware/auth-guard.js';
import { buildAssistantDeps } from './assistant.deps.js';
import { AssistantService } from './assistant.service.js';
import {
  chatRequestSchema,
  chatResponseSchema,
  executeRequestSchema,
  executeResponseSchema,
} from './assistant.schemas.js';

export const assistantRoutes: FastifyPluginAsyncZod = async (router) => {
  const service = new AssistantService(buildAssistantDeps(db));
  router.addHook('preHandler', authenticate);

  router.post(
    '/chat',
    {
      schema: {
        body: chatRequestSchema,
        response: { 200: chatResponseSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const result = await service.chat(user.id, request.body.messages);
      return reply.status(200).send(result);
    },
  );

  router.post(
    '/execute',
    {
      schema: {
        body: executeRequestSchema,
        response: { 200: executeResponseSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const result = await service.execute(user.id, request.body.tool, request.body.args);
      return reply.status(200).send({ ok: true, result });
    },
  );
};
