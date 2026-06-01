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

async function createContact(cookie: string, appId: string, overrides = {}) {
  return app.inject(
    authed(cookie, {
      method: 'POST',
      url: `/api/applications/${appId}/contacts`,
      payload: { name: 'Jane Recruiter', role: 'Recruiter', ...overrides },
    }),
  );
}

describe('contacts', () => {
  it('creates a contact and logs a note activity', async () => {
    const res = await createContact(session.cookie, applicationId, {
      email: 'jane@acme.example.com',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Jane Recruiter');

    const activities = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/activities`,
      }),
    );
    const descriptions = activities.json().map((a: { description: string }) => a.description);
    expect(descriptions).toContain('Added contact Jane Recruiter');
  });

  it('lists contacts', async () => {
    await createContact(session.cookie, applicationId);
    await createContact(session.cookie, applicationId, { name: 'Bob Hiring' });
    const res = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/applications/${applicationId}/contacts`,
      }),
    );
    expect(res.json()).toHaveLength(2);
  });

  it('updates and clears contact fields', async () => {
    const created = await createContact(session.cookie, applicationId, {
      phone: '+49 30 1234',
    });
    const id = created.json().id;
    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/contacts/${id}`,
        payload: { role: 'Hiring Manager', phone: null },
      }),
    );
    expect(res.json().role).toBe('Hiring Manager');
    expect(res.json().phone).toBeNull();
  });

  it('deletes a contact', async () => {
    const created = await createContact(session.cookie, applicationId);
    const id = created.json().id;
    const del = await app.inject(
      authed(session.cookie, { method: 'DELETE', url: `/api/contacts/${id}` }),
    );
    expect(del.statusCode).toBe(204);
  });

  it('rejects an invalid email', async () => {
    const res = await createContact(session.cookie, applicationId, {
      email: 'not-an-email',
    });
    expect(res.statusCode).toBe(400);
  });

  it('does not leak another user contact', async () => {
    const created = await createContact(session.cookie, applicationId);
    const id = created.json().id;
    const other = await registerUser(app, { email: 'intruder3@example.com' });
    const res = await app.inject(
      authed(other.cookie, { method: 'GET', url: `/api/contacts/${id}` }),
    );
    expect(res.statusCode).toBe(404);
  });
});
