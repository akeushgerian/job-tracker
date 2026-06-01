import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from '../../lib/cookies.js';
import { verifyToken } from '../../lib/jwt.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { authenticate, requireUser } from '../../middleware/auth-guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import {
  authResponseSchema,
  loginSchema,
  messageSchema,
  registerSchema,
  userPublicSchema,
} from './auth.schemas.js';

export const authRoutes: FastifyPluginAsyncZod = async (router) => {
  const service = new AuthService(new AuthRepository(db));

  router.post(
    '/register',
    {
      schema: {
        body: registerSchema,
        response: { 201: authResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await service.register(request.body);
      setAuthCookies(reply, result.tokens);
      return reply.status(201).send({ user: result.user });
    },
  );

  router.post(
    '/login',
    {
      schema: {
        body: loginSchema,
        response: { 200: authResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await service.login(request.body);
      setAuthCookies(reply, result.tokens);
      return reply.status(200).send({ user: result.user });
    },
  );

  router.post(
    '/refresh',
    {
      schema: {
        response: { 200: authResponseSchema },
      },
    },
    async (request, reply) => {
      const token = request.cookies[REFRESH_COOKIE];
      if (!token) {
        throw new UnauthorizedError('Missing refresh token');
      }
      const payload = verifyToken('refresh', token);
      const result = await service.refresh(payload.sub);
      setAuthCookies(reply, result.tokens);
      return reply.status(200).send({ user: result.user });
    },
  );

  router.post(
    '/logout',
    {
      schema: {
        response: { 200: messageSchema },
      },
    },
    async (_request, reply) => {
      clearAuthCookies(reply);
      return reply.status(200).send({ message: 'Logged out' });
    },
  );

  router.get(
    '/me',
    {
      preHandler: authenticate,
      schema: {
        response: { 200: userPublicSchema },
      },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const profile = await service.getProfile(user.id);
      return reply.status(200).send(profile);
    },
  );
};
