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

const baseApplication = {
  companyName: 'Acme Corp',
  positionTitle: 'Senior Backend Engineer',
  jobUrl: 'https://acme.example.com/jobs/1',
  salaryMin: 80000,
  salaryMax: 120000,
  location: 'Berlin',
  remoteType: 'hybrid',
  source: 'linkedin',
};

async function createApplication(
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await app.inject(
    authed(cookie, {
      method: 'POST',
      url: '/api/applications',
      payload: { ...baseApplication, ...overrides },
    }),
  );
  return res;
}

describe('POST /api/applications', () => {
  it('creates an application defaulting to discovered and logs an activity', async () => {
    const res = await createApplication(session.cookie);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.companyName).toBe('Acme Corp');
    expect(body.status).toBe('discovered');
    expect(body.userId).toBe(session.userId);
    expect(body.id).toBeDefined();
  });

  it('rejects missing required fields with 400', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/applications',
        payload: { positionTitle: 'No company' },
      }),
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects salaryMax below salaryMin', async () => {
    const res = await createApplication(session.cookie, {
      salaryMin: 100000,
      salaryMax: 50000,
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/applications',
      payload: baseApplication,
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/applications', () => {
  it('lists only the current user applications with pagination', async () => {
    await createApplication(session.cookie, { companyName: 'A' });
    await createApplication(session.cookie, { companyName: 'B' });

    const other = await registerUser(app, { email: 'other@example.com' });
    await createApplication(other.cookie, { companyName: 'Hidden' });

    const res = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/applications' }),
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    const names = body.data.map((a: { companyName: string }) => a.companyName);
    expect(names).not.toContain('Hidden');
  });

  it('filters by status', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}/status`,
        payload: { status: 'applied' },
      }),
    );
    await createApplication(session.cookie, { companyName: 'Still discovered' });

    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: '/api/applications?status=applied',
      }),
    );
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe('applied');
  });

  it('searches by company or position', async () => {
    await createApplication(session.cookie, { companyName: 'Globex' });
    await createApplication(session.cookie, { companyName: 'Initech' });

    const res = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/applications?q=glob' }),
    );
    const body = res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].companyName).toBe('Globex');
  });

  it('paginates results', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createApplication(session.cookie, { companyName: `Co ${i}` });
    }
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: '/api/applications?page=1&pageSize=2',
      }),
    );
    const body = res.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(5);
    expect(body.pagination.totalPages).toBe(3);
  });
});

describe('GET /api/applications/:id', () => {
  it('returns a single application', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, { method: 'GET', url: `/api/applications/${id}` }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: '/api/applications/00000000-0000-0000-0000-000000000000',
      }),
    );
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('does not leak another user application', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const other = await registerUser(app, { email: 'other2@example.com' });
    const res = await app.inject(
      authed(other.cookie, { method: 'GET', url: `/api/applications/${id}` }),
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/applications/:id', () => {
  it('updates editable fields', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}`,
        payload: { notes: 'Phone screen went well', location: 'Remote-friendly' },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().notes).toBe('Phone screen went well');
    expect(res.json().location).toBe('Remote-friendly');
  });

  it('clears a field when set to null', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}`,
        payload: { salaryMin: null },
      }),
    );
    expect(res.json().salaryMin).toBeNull();
  });
});

describe('PATCH /api/applications/:id/status', () => {
  it('advances one stage and records a status_change activity', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}/status`,
        payload: { status: 'applied' },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('applied');
  });

  it('rejects skipping a stage with 422', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}/status`,
        payload: { status: 'offer' },
      }),
    );
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('allows withdrawing from any active stage', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}/status`,
        payload: { status: 'withdrawn' },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('withdrawn');
  });

  it('rejects transitions out of a terminal state', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}/status`,
        payload: { status: 'rejected' },
      }),
    );
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/applications/${id}/status`,
        payload: { status: 'applied' },
      }),
    );
    expect(res.statusCode).toBe(422);
  });
});

describe('DELETE /api/applications/:id', () => {
  it('deletes an application', async () => {
    const created = await createApplication(session.cookie);
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, { method: 'DELETE', url: `/api/applications/${id}` }),
    );
    expect(res.statusCode).toBe(204);

    const after = await app.inject(
      authed(session.cookie, { method: 'GET', url: `/api/applications/${id}` }),
    );
    expect(after.statusCode).toBe(404);
  });

  it('returns 404 deleting an unknown id', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'DELETE',
        url: '/api/applications/00000000-0000-0000-0000-000000000000',
      }),
    );
    expect(res.statusCode).toBe(404);
  });
});
