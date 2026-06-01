import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { extractCookies } from '../../../test/helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const validUser = {
  email: 'alice@example.com',
  password: 'password123',
  name: 'Alice',
};

describe('POST /api/auth/register', () => {
  it('creates a user and sets auth cookies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe('alice@example.com');
    expect(body.user).not.toHaveProperty('passwordHash');

    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
    expect(cookieStr).toContain('access_token=');
    expect(cookieStr).toContain('refresh_token=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('rejects a duplicate email with 409', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: validUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CONFLICT');
  });

  it('rejects invalid input with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-an-email', password: 'short', name: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: validUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: validUser.email, password: validUser.password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(validUser.email);
  });

  it('rejects a wrong password with 401', async () => {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: validUser });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: validUser.email, password: 'wrongpassword' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });
    const cookie = extractCookies(reg);

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe(validUser.email);
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('auth session lifecycle', () => {
  it('refreshes tokens with a valid refresh cookie', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: validUser,
    });
    const cookie = extractCookies(reg);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(validUser.email);
  });

  it('rejects refresh without a cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh' });
    expect(res.statusCode).toBe(401);
  });

  it('clears cookies on logout', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(200);
    const cookieStr = String(res.headers['set-cookie']);
    expect(cookieStr).toContain('access_token=;');
  });
});

describe('GET /health', () => {
  it('reports ok with database up', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().database).toBe('up');
  });
});
