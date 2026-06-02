import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { authed, registerUser, type TestSession } from '../../../test/helpers.js';

let app: FastifyInstance;
let session: TestSession;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  session = await registerUser(app);
});

describe('GET /api/profile', () => {
  it('returns null when the user has no profile yet', async () => {
    const res = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/profile' }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/profile' });
    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/profile', () => {
  it('creates the profile on first save and reads it back', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PUT',
        url: '/api/profile',
        payload: {
          headline: 'Senior Backend Engineer',
          targetRole: 'Staff Engineer',
          branch: 'Fintech',
          skills: ['TypeScript', 'Postgres'],
          links: { github: 'https://github.com/me' },
          summary: '# About\nI build things.',
        },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().headline).toBe('Senior Backend Engineer');
    expect(res.json().skills).toEqual(['TypeScript', 'Postgres']);

    const read = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/profile' }),
    );
    expect(read.json().branch).toBe('Fintech');
    expect(read.json().links.github).toBe('https://github.com/me');
  });

  it('replaces the profile on a second save without duplicating', async () => {
    await app.inject(
      authed(session.cookie, {
        method: 'PUT',
        url: '/api/profile',
        payload: { headline: 'First' },
      }),
    );
    const second = await app.inject(
      authed(session.cookie, {
        method: 'PUT',
        url: '/api/profile',
        payload: { headline: 'Second' },
      }),
    );
    expect(second.statusCode).toBe(200);
    expect(second.json().headline).toBe('Second');

    const read = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/profile' }),
    );
    expect(read.json().headline).toBe('Second');
  });

  it('scopes the profile to its owner', async () => {
    await app.inject(
      authed(session.cookie, {
        method: 'PUT',
        url: '/api/profile',
        payload: { headline: 'Owner A' },
      }),
    );
    const other = await registerUser(app, { email: 'other-profile@example.com' });
    const res = await app.inject(
      authed(other.cookie, { method: 'GET', url: '/api/profile' }),
    );
    expect(res.json()).toBeNull();
  });

  it('rejects an invalid link with 400', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PUT',
        url: '/api/profile',
        payload: { links: { linkedin: 'not-a-url' } },
      }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/profile',
      payload: { headline: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });
});
