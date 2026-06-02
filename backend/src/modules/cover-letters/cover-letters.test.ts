import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import {
  authed,
  createApplication,
  registerUser,
  type TestSession,
} from '../../../test/helpers.js';

// Mock the LLM round-trip so generation is deterministic and offline.
const { chatMock } = vi.hoisted(() => ({ chatMock: vi.fn() }));
vi.mock('../assistant/assistant.llm.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../assistant/assistant.llm.js')>();
  return { ...actual, chatCompletion: chatMock };
});

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
  chatMock.mockReset();
  chatMock.mockResolvedValue({ content: 'Dear hiring manager, ...', toolCalls: [] });
  session = await registerUser(app);
});

async function saveProfile(cookie: string): Promise<void> {
  const res = await app.inject(
    authed(cookie, {
      method: 'PUT',
      url: '/api/profile',
      payload: { headline: 'Backend Engineer', skills: ['TypeScript'] },
    }),
  );
  if (res.statusCode !== 200) throw new Error(`profile save failed: ${res.body}`);
}

describe('POST /api/cover-letters/generate', () => {
  it('generates and persists a letter from pasted job text', async () => {
    await saveProfile(session.cookie);
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { jobText: 'We are hiring a Node.js engineer at Globex.' },
      }),
    );
    expect(res.statusCode).toBe(201);
    expect(res.json().content).toContain('Dear hiring manager');

    const list = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/cover-letters' }),
    );
    expect(list.json()).toHaveLength(1);
  });

  it('requires a profile first', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { jobText: 'Some job' },
      }),
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('PROFILE_REQUIRED');
    expect(chatMock).not.toHaveBeenCalled();
  });

  it('rejects when no job source is given', async () => {
    await saveProfile(session.cookie);
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: {},
      }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('returns 502 and persists nothing when the LLM is unreachable', async () => {
    await saveProfile(session.cookie);
    const { LlmError } = await import('../assistant/assistant.llm.js');
    chatMock.mockRejectedValueOnce(new LlmError('Ollama down'));

    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { jobText: 'A job' },
      }),
    );
    expect(res.statusCode).toBe(502);

    const list = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/cover-letters' }),
    );
    expect(list.json()).toHaveLength(0);
  });

  it('links the letter to an application and clears the link on deletion', async () => {
    await saveProfile(session.cookie);
    const appId = await createApplication(app, session.cookie, { companyName: 'Initech' });

    const gen = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { applicationId: appId },
      }),
    );
    expect(gen.statusCode).toBe(201);
    expect(gen.json().applicationId).toBe(appId);
    const letterId = gen.json().id;

    const filtered = await app.inject(
      authed(session.cookie, {
        method: 'GET',
        url: `/api/cover-letters?applicationId=${appId}`,
      }),
    );
    expect(filtered.json()).toHaveLength(1);

    await app.inject(
      authed(session.cookie, { method: 'DELETE', url: `/api/applications/${appId}` }),
    );

    const after = await app.inject(
      authed(session.cookie, { method: 'GET', url: `/api/cover-letters/${letterId}` }),
    );
    expect(after.statusCode).toBe(200);
    expect(after.json().applicationId).toBeNull();
  });
});

describe('cover-letter ownership', () => {
  it('returns 404 when accessing another user letter', async () => {
    await saveProfile(session.cookie);
    const gen = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { jobText: 'A job' },
      }),
    );
    const letterId = gen.json().id;

    const other = await registerUser(app, { email: 'cl-intruder@example.com' });
    for (const method of ['GET', 'DELETE'] as const) {
      const res = await app.inject(
        authed(other.cookie, { method, url: `/api/cover-letters/${letterId}` }),
      );
      expect(res.statusCode).toBe(404);
    }
  });

  it('edits the content of an owned letter', async () => {
    await saveProfile(session.cookie);
    const gen = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { jobText: 'A job' },
      }),
    );
    const letterId = gen.json().id;

    const res = await app.inject(
      authed(session.cookie, {
        method: 'PATCH',
        url: `/api/cover-letters/${letterId}`,
        payload: { content: 'My edited letter.' },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().content).toBe('My edited letter.');
  });
});

describe('format references', () => {
  it('creates and lists references', async () => {
    const create = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/references',
        payload: { label: 'My style', content: 'A sample letter.' },
      }),
    );
    expect(create.statusCode).toBe(201);

    const list = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/cover-letters/references' }),
    );
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].label).toBe('My style');
  });

  it('scopes references to their owner', async () => {
    const create = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/references',
        payload: { label: 'A', content: 'sample' },
      }),
    );
    const refId = create.json().id;

    const other = await registerUser(app, { email: 'ref-intruder@example.com' });
    const res = await app.inject(
      authed(other.cookie, {
        method: 'DELETE',
        url: `/api/cover-letters/references/${refId}`,
      }),
    );
    expect(res.statusCode).toBe(404);
  });

  it('uses a saved reference during generation', async () => {
    await saveProfile(session.cookie);
    const create = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/references',
        payload: { label: 'Style', content: 'Reference sample text.' },
      }),
    );
    const referenceId = create.json().id;

    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/cover-letters/generate',
        payload: { jobText: 'A job', referenceId },
      }),
    );
    expect(res.statusCode).toBe(201);
    const userMessage = chatMock.mock.calls[0]![0].at(-1).content as string;
    expect(userMessage).toContain('Reference sample text.');
  });
});

describe('authentication', () => {
  it('rejects unauthenticated access', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/cover-letters' });
    expect(res.statusCode).toBe(401);
  });
});
