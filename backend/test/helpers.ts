import type { FastifyInstance, InjectOptions } from 'fastify';
import type { LightMyRequestResponse } from 'fastify';

/**
 * Collects Set-Cookie headers from a response into a Cookie header string,
 * so a sequence of requests can act as one authenticated session.
 */
export function extractCookies(res: LightMyRequestResponse): string {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((c) => c.split(';')[0]).join('; ');
}

export interface TestSession {
  cookie: string;
  userId: string;
}

let userCounter = 0;

/**
 * Registers a fresh user and returns a session cookie usable as
 * `headers: { cookie }` on subsequent requests.
 */
export async function registerUser(
  app: FastifyInstance,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<TestSession> {
  userCounter += 1;
  const payload = {
    email: overrides.email ?? `user${userCounter}@example.com`,
    password: overrides.password ?? 'password123',
    name: overrides.name ?? `User ${userCounter}`,
  };
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload,
  });
  if (res.statusCode !== 201) {
    throw new Error(`Failed to register test user: ${res.body}`);
  }
  const body = res.json() as { user: { id: string } };
  return { cookie: extractCookies(res), userId: body.user.id };
}

export function authed(cookie: string, options: InjectOptions): InjectOptions {
  return { ...options, headers: { ...options.headers, cookie } };
}
