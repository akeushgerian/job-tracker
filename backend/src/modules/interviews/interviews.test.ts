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

async function createInterview(cookie: string, appId: string, overrides = {}) {
  return app.inject(
    authed(cookie, {
      method: 'POST',
      url: `/api/applications/${appId}/interviews`,
      payload: { type: 'technical', durationMinutes: 60, ...overrides },
    }),
  );
}

describe('interviews', () => {
  it('creates an interview and logs an interview_scheduled activity', async () => {
    const res = await createInterview(session.cookie, applicationId, {
      scheduledAt: '2026-07-01T10:00:00.000Z',
      interviewerName: 'Jane Doe',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().type).toBe('technical');
    expect(res.json().outcome).toBe('pending');

    const activities = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/activities`,
      }),
    );
    const types = activities.json().map((a: { type: string }) => a.type);
    expect(types).toContain('interview_scheduled');
  });

  it('lists interviews for an application', async () => {
    await createInterview(session.cookie, applicationId);
    await createInterview(session.cookie, applicationId, { type: 'final' });
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/interviews`,
      }),
    );
    expect(res.json()).toHaveLength(2);
  });

  it('updates an interview outcome', async () => {
    const created = await createInterview(session.cookie, applicationId);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/interviews/${id}`,
        payload: { completed: true, outcome: 'passed' },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().completed).toBe(true);
    expect(res.json().outcome).toBe('passed');
  });

  it('deletes an interview', async () => {
    const created = await createInterview(session.cookie, applicationId);
    const id = created.json().id;
    const del = await app.inject(
      authed(session.cookie, { method: 'DELETE', url: `/api/interviews/${id}` }),
    );
    expect(del.statusCode).toBe(204);
    const get = await app.inject(
      authed(session.cookie, { method: 'GET', url: `/api/interviews/${id}` }),
    );
    expect(get.statusCode).toBe(404);
  });

  it('rejects creating on another user application', async () => {
    const other = await registerUser(app, { email: 'intruder@example.com' });
    const res = await createInterview(other.cookie, applicationId);
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('does not leak another user interview', async () => {
    const created = await createInterview(session.cookie, applicationId);
    const id = created.json().id;
    const other = await registerUser(app, { email: 'intruder2@example.com' });
    const res = await app.inject(
      authed(other.cookie, { method: 'GET', url: `/api/interviews/${id}` }),
    );
    expect(res.statusCode).toBe(404);
  });

  it('validates the interview type', async () => {
    const res = await createInterview(session.cookie, applicationId, { type: 'bogus' });
    expect(res.statusCode).toBe(400);
  });
});
