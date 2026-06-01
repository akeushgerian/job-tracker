import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import {
  authed,
  createApplication,
  registerUser,
  type TestSession,
} from '../../../test/helpers.js';

let app: FastifyInstance;
let session: TestSession;
let applicationId: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  session = await registerUser(app);
  applicationId = await createApplication(app, session.cookie);
});

describe('activities', () => {
  it('records a creation activity automatically', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/activities`,
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThanOrEqual(1);
    expect(res.json()[0].type).toBe('note');
  });

  it('allows adding a manual note activity', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${applicationId}/activities`,
        payload: { type: 'email_sent', description: 'Sent intro email' },
      }),
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().type).toBe('email_sent');
  });

  it('rejects a system-only activity type from the manual endpoint', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${applicationId}/activities`,
        payload: { type: 'status_change', description: 'nope' },
      }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns activities newest first', async () => {
    await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${applicationId}/activities`,
        payload: { type: 'note', description: 'Newest' },
      }),
    );
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/activities`,
      }),
    );
    expect(res.json()[0].description).toBe('Newest');
  });

  it('does not expose another user activities', async () => {
    const other = await registerUser(app, { email: 'nosey@example.com' });
    const res = await app.inject(
      authed(other.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/activities`,
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});
