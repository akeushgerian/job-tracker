import type { FastifyReply } from 'fastify';
import { config } from '../config/index.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const baseOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/',
};

// Cookie max-age in seconds. Kept in sync with the JWT TTLs at a coarse level;
// the JWT itself remains the source of truth for expiry.
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    maxAge: ACCESS_MAX_AGE,
  });
  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, { path: '/' });
  reply.clearCookie(REFRESH_COOKIE, { path: '/' });
}
