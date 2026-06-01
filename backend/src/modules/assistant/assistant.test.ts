import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { db } from '../../db/client.js';
import {
  authed,
  createApplication,
  registerUser,
  type TestSession,
} from '../../../test/helpers.js';
import { buildAssistantDeps } from './assistant.deps.js';
import { AssistantService } from './assistant.service.js';
import { toolDefinitions } from './assistant.tools.js';

// Mock the LLM round-trip so the agent loop is deterministic and offline.
const { chatMock } = vi.hoisted(() => ({ chatMock: vi.fn() }));
vi.mock('./assistant.llm.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./assistant.llm.js')>();
  return { ...actual, chatCompletion: chatMock };
});

function toolCall(name: string, args: object) {
  return {
    id: `call_${name}`,
    type: 'function' as const,
    function: { name, arguments: JSON.stringify(args) },
  };
}

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
  session = await registerUser(app);
});

describe('assistant tool definitions', () => {
  it('exposes object-typed JSON schemas for every tool', () => {
    const defs = toolDefinitions();
    expect(defs.length).toBeGreaterThan(0);
    for (const def of defs) {
      expect(def.type).toBe('function');
      expect(def.function.parameters).toMatchObject({ type: 'object' });
    }
  });
});

describe('agent loop', () => {
  it('executes a read tool and returns a grounded reply', async () => {
    await createApplication(app, session.cookie, { companyName: 'Globex' });
    const service = new AssistantService(buildAssistantDeps(db));

    chatMock
      .mockResolvedValueOnce({ content: '', toolCalls: [toolCall('search_applications', {})] })
      .mockResolvedValueOnce({ content: 'You have 1 application: Globex.', toolCalls: [] });

    const result = await service.chat(session.userId, [
      { role: 'user', content: 'what have I applied to?' },
    ]);

    expect(result.reply).toContain('Globex');
    expect(result.steps.map((s) => s.tool)).toContain('search_applications');
    expect(result.proposedActions).toHaveLength(0);
  });

  it('collects a write tool as a proposal without executing it', async () => {
    const service = new AssistantService(buildAssistantDeps(db));
    const deps = buildAssistantDeps(db);

    chatMock
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          toolCall('create_application', {
            companyName: 'Stripe',
            positionTitle: 'Backend Engineer',
          }),
        ],
      })
      .mockResolvedValueOnce({ content: 'I prepared a new application.', toolCalls: [] });

    const result = await service.chat(session.userId, [
      { role: 'user', content: 'add a Stripe backend role' },
    ]);

    expect(result.proposedActions).toHaveLength(1);
    expect(result.proposedActions[0]!.tool).toBe('create_application');

    // Nothing should have been written yet.
    const list = await deps.applications.list(session.userId, {
      page: 1,
      pageSize: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(list.data).toHaveLength(0);
  });
});

describe('POST /api/assistant/execute', () => {
  it('applies a confirmed create_application action', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/assistant/execute',
        payload: {
          tool: 'create_application',
          args: { companyName: 'Linear', positionTitle: 'Product Engineer' },
        },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const list = await app.inject(
      authed(session.cookie, { method: 'GET', url: '/api/applications' }),
    );
    expect(list.json().data[0].companyName).toBe('Linear');
  });

  it('rejects executing a read-only tool', async () => {
    const res = await app.inject(
      authed(session.cookie, {
        method: 'POST',
        url: '/api/assistant/execute',
        payload: { tool: 'search_applications', args: {} },
      }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('enforces ownership on confirmed actions', async () => {
    const id = await createApplication(app, session.cookie);
    const other = await registerUser(app, { email: 'intruder@example.com' });
    const res = await app.inject(
      authed(other.cookie, {
        method: 'POST',
        url: '/api/assistant/execute',
        payload: { tool: 'change_status', args: { applicationId: id, status: 'applied' } },
      }),
    );
    expect(res.statusCode).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/chat',
      payload: { messages: [{ role: 'user', content: 'hi' }] },
    });
    expect(res.statusCode).toBe(401);
  });
});
