import type { FastifyReply, FastifyRequest } from 'fastify';
import { ACCESS_COOKIE } from '../lib/cookies.js';
import { verifyToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
import type { AuthUser } from '../types/auth.js';

/**
 * preHandler that requires a valid access token. On success it populates
 * `request.user`; otherwise it throws UnauthorizedError, handled globally.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[ACCESS_COOKIE];
  if (!token) {
    throw new UnauthorizedError();
  }

  const payload = verifyToken('access', token);
  const user: AuthUser = { id: payload.sub, email: payload.email };
  request.user = user;
}

export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.user) {
    throw new UnauthorizedError();
  }
  return request.user;
}
