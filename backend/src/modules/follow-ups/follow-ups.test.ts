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

async function createFollowUp(cookie: string, appId: string, overrides = {}) {
  return app.inject(
    authed(cookie, {
      method: 'POST',
      url: `/api/applications/${appId}/follow-ups`,
      payload: {
        dueDate: '2026-07-15T09:00:00.000Z',
        description: 'Send thank-you email',
        ...overrides,
      },
    }),
  );
}

describe('follow-ups', () => {
  it('creates a follow-up and logs a follow_up activity', async () => {
    const res = await createFollowUp(session.cookie, applicationId);
    expect(res.statusCode).toBe(201);
    expect(res.json().completed).toBe(false);

    const activities = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/activities`,
      }),
    );
    const types = activities.json().map((a: { type: string }) => a.type);
    expect(types).toContain('follow_up');
  });

  it('marks a follow-up complete', async () => {
    const created = await createFollowUp(session.cookie, applicationId);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/follow-ups/${id}`,
        payload: { completed: true },
      }),
    );
    expect(res.json().completed).toBe(true);
  });

  it('lists follow-ups ordered by due date', async () => {
    await createFollowUp(session.cookie, applicationId, {
      dueDate: '2026-08-01T09:00:00.000Z',
      description: 'Later',
    });
    await createFollowUp(session.cookie, applicationId, {
      dueDate: '2026-06-01T09:00:00.000Z',
      description: 'Sooner',
    });
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/follow-ups`,
      }),
    );
    const descriptions = res.json().map((f: { description: string }) => f.description);
    expect(descriptions[0]).toBe('Sooner');
  });

  it('requires a due date', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${applicationId}/follow-ups`,
        payload: { description: 'No due date' },
      }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('deletes a follow-up', async () => {
    const created = await createFollowUp(session.cookie, applicationId);
    const id = created.json().id;
    const del = await app.inject(
      authed(session.cookie, { method: 'DELETE', url: `/api/follow-ups/${id}` }),
    );
    expect(del.statusCode).toBe(204);
    const get = await app.inject(
      authed(session.cookie, { method: 'GET', url: `/api/follow-ups/${id}` }),
    );
    expect(get.statusCode).toBe(404);
  });
});
