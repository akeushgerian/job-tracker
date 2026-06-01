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

function getStats(cookie: string) {
  return app.inject(authed(cookie, { method: 'GET', url: '/api/dashboard/stats' }));
}

async function advance(cookie: string, id: string, status: string) {
  return app.inject(
    authed(cookie, {
      method: 'PATCH',
      url: `/api/applications/${id}/status`,
      payload: { status },
    }),
  );
}

describe('GET /api/dashboard/stats', () => {
  it('returns zeroed stats for a new user', async () => {
    const res = await getStats(session.cookie);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totals.total).toBe(0);
    expect(body.responseRate).toBe(0);
    expect(body.averageTimeToResponseDays).toBeNull();
    expect(body.upcomingInterviews).toEqual([]);
    expect(body.overdueFollowUps).toEqual([]);
  });

  it('counts applications by status', async () => {
    const a = await createApplication(app, session.cookie, { companyName: 'A' });
    await createApplication(app, session.cookie, { companyName: 'B' });
    await advance(session.cookie, a, 'applied');

    const body = (await getStats(session.cookie)).json();
    expect(body.totals.total).toBe(2);
    expect(body.byStatus.discovered).toBe(1);
    expect(body.byStatus.applied).toBe(1);
    expect(body.totals.active).toBe(2);
  });

  it('computes a response rate', async () => {
    // Two applied; one of them responds (recruiter_call).
    const a = await createApplication(app, session.cookie, { companyName: 'A' });
    const b = await createApplication(app, session.cookie, { companyName: 'B' });
    await advance(session.cookie, a, 'applied');
    await advance(session.cookie, b, 'applied');
    await advance(session.cookie, a, 'recruiter_call');

    const body = (await getStats(session.cookie)).json();
    // applied = 2 (both past discovered), responded = 1 => 0.5
    expect(body.responseRate).toBeCloseTo(0.5, 5);
  });

  it('lists overdue follow-ups', async () => {
    const id = await createApplication(app, session.cookie);
    await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${id}/follow-ups`,
        payload: { dueDate: '2020-01-01T00:00:00.000Z', description: 'Ping recruiter' },
      }),
    );
    const body = (await getStats(session.cookie)).json();
    expect(body.overdueFollowUps).toHaveLength(1);
    expect(body.overdueFollowUps[0].description).toBe('Ping recruiter');
    expect(body.overdueFollowUps[0].companyName).toBe('Acme Corp');
  });

  it('lists upcoming interviews and excludes past ones', async () => {
    const id = await createApplication(app, session.cookie);
    await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${id}/interviews`,
        payload: { type: 'technical', scheduledAt: '2999-01-01T10:00:00.000Z' },
      }),
    );
    await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: `/api/applications/${id}/interviews`,
        payload: { type: 'final', scheduledAt: '2000-01-01T10:00:00.000Z' },
      }),
    );
    const body = (await getStats(session.cookie)).json();
    expect(body.upcomingInterviews).toHaveLength(1);
    expect(body.upcomingInterviews[0].type).toBe('technical');
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard/stats' });
    expect(res.statusCode).toBe(401);
  });
});
