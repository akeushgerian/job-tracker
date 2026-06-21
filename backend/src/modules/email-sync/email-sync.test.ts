import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { authed, registerUser, type TestSession } from '../../../test/helpers.js';
import { db } from '../../db/client.js';
import { gmailConnections, emailMatches, applications } from '../../db/schema.js';
import { encrypt } from '../../lib/token-crypto.js';

// Ensure TOKEN_ENCRYPTION_KEY is set for tests
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/email-sync/oauth/callback';

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

async function insertActiveConnection(userId: string) {
  const [conn] = await db.insert(gmailConnections).values({
    userId,
    encryptedAccessToken: encrypt('fake-access-token'),
    encryptedRefreshToken: encrypt('fake-refresh-token'),
    connectedEmail: 'test@gmail.com',
    status: 'active',
  }).returning();
  return conn!;
}

// --- Status ---

describe('GET /api/email-sync/status', () => {
  it('returns not connected when no Gmail account linked', async () => {
    const res = await app.inject(authed(session.cookie, { method: 'GET', url: '/api/email-sync/status' }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ connected: false, connectedEmail: null, needsReauth: false });
  });

  it('returns connected status after inserting a connection', async () => {
    await insertActiveConnection(session.userId);
    const res = await app.inject(authed(session.cookie, { method: 'GET', url: '/api/email-sync/status' }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ connected: true, connectedEmail: 'test@gmail.com', needsReauth: false });
  });

  it('returns needsReauth when connection status is needs_reauth', async () => {
    await db.insert(gmailConnections).values({
      userId: session.userId,
      encryptedAccessToken: encrypt('tok'),
      encryptedRefreshToken: encrypt('ref'),
      connectedEmail: 'test@gmail.com',
      status: 'needs_reauth',
    });
    const res = await app.inject(authed(session.cookie, { method: 'GET', url: '/api/email-sync/status' }));
    expect(res.json()).toMatchObject({ needsReauth: true });
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/email-sync/status' });
    expect(res.statusCode).toBe(401);
  });
});

// --- Disconnect ---

describe('DELETE /api/email-sync/connection', () => {
  it('returns 204 even when no connection exists', async () => {
    const res = await app.inject(authed(session.cookie, { method: 'DELETE', url: '/api/email-sync/connection' }));
    expect(res.statusCode).toBe(204);
  });

  it('removes the connection record', async () => {
    await insertActiveConnection(session.userId);
    const res = await app.inject(authed(session.cookie, { method: 'DELETE', url: '/api/email-sync/connection' }));
    expect(res.statusCode).toBe(204);
    const statusRes = await app.inject(authed(session.cookie, { method: 'GET', url: '/api/email-sync/status' }));
    expect(statusRes.json()).toMatchObject({ connected: false });
  });

  it('does not delete email match records on disconnect', async () => {
    await insertActiveConnection(session.userId);
    const [app1] = await db.insert(applications).values({
      userId: session.userId,
      companyName: 'Acme',
      positionTitle: 'Engineer',
      status: 'applied',
    }).returning();
    await db.insert(emailMatches).values({
      userId: session.userId,
      gmailMessageId: 'msg-1',
      applicationId: app1!.id,
      subject: 'Your application',
      sender: 'recruiter@acme.com',
      receivedAt: new Date(),
      status: 'applied',
      action: 'none',
      confidence: 0.9,
    });
    await app.inject(authed(session.cookie, { method: 'DELETE', url: '/api/email-sync/connection' }));
    const matches = await db.select().from(emailMatches);
    expect(matches).toHaveLength(1);
  });
});

// --- OAuth URL ---

describe('GET /api/email-sync/oauth/url', () => {
  it('returns a Google OAuth URL', async () => {
    const res = await app.inject(authed(session.cookie, { method: 'GET', url: '/api/email-sync/oauth/url' }));
    expect(res.statusCode).toBe(200);
    const { url } = res.json() as { url: string };
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('scope=');
  });
});

// --- Confirm / Dismiss ---

describe('PATCH /api/email-sync/matches/:id/dismiss', () => {
  it('sets match status to ignored', async () => {
    const [app1] = await db.insert(applications).values({
      userId: session.userId,
      companyName: 'Acme',
      positionTitle: 'Engineer',
      status: 'applied',
    }).returning();
    const [match] = await db.insert(emailMatches).values({
      userId: session.userId,
      gmailMessageId: 'msg-2',
      applicationId: app1!.id,
      subject: 'Test',
      sender: 'test@example.com',
      receivedAt: new Date(),
      status: 'pending_review',
      action: 'none',
      confidence: 0.5,
    }).returning();

    const res = await app.inject(authed(session.cookie, {
      method: 'PATCH',
      url: `/api/email-sync/matches/${match!.id}/dismiss`,
    }));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ignored' });
  });

  it('returns 404 for a match belonging to another user', async () => {
    const other = await registerUser(app);
    const [app1] = await db.insert(applications).values({
      userId: other.userId,
      companyName: 'Other',
      positionTitle: 'Dev',
      status: 'applied',
    }).returning();
    const [match] = await db.insert(emailMatches).values({
      userId: other.userId,
      gmailMessageId: 'msg-3',
      applicationId: app1!.id,
      subject: 'Test',
      sender: 'test@example.com',
      receivedAt: new Date(),
      status: 'pending_review',
      action: 'none',
      confidence: 0.5,
    }).returning();

    const res = await app.inject(authed(session.cookie, {
      method: 'PATCH',
      url: `/api/email-sync/matches/${match!.id}/dismiss`,
    }));
    expect(res.statusCode).toBe(404);
  });
});
