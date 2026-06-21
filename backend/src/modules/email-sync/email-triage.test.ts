import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the DB and LLM before importing the module
vi.mock('../../db/client.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: 'app-1', company: 'Acme', role: 'Engineer', status: 'applied' },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock('../assistant/assistant.llm.js', () => ({
  chatCompletion: vi.fn(),
}));

import { chatCompletion } from '../assistant/assistant.llm.js';
import { EmailTriageService } from './email-triage.js';
import type { EmailSyncService } from './email-sync.service.js';

const mockChatCompletion = vi.mocked(chatCompletion);

function makeService() {
  const mockSyncService = {
    existsMatch: vi.fn().mockResolvedValue(false),
    createMatch: vi.fn().mockImplementation(async (data) => ({ ...data, id: 'match-1', createdAt: new Date() })),
  } as unknown as EmailSyncService;

  return { service: new EmailTriageService(mockSyncService), mockSyncService };
}

const sampleEmail = {
  messageId: 'msg-abc',
  subject: 'Interview invitation - Engineer at Acme',
  sender: 'recruiter@acme.com',
  snippet: 'We would like to invite you to interview…',
  body: 'We would like to invite you to an interview for the Software Engineer position at Acme Corp.',
  receivedAt: new Date(),
};

describe('EmailTriageService.triageEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores match as applied when confident and job-related', async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        jobRelated: true,
        applicationId: 'app-1',
        confidence: 0.95,
        action: 'interview_invite',
        newStatus: null,
        interviewAt: null,
        contactName: null,
        contactRole: null,
      }),
      toolCalls: [],
    });

    const { service, mockSyncService } = makeService();
    const count = await service.triageEmail('user-1', sampleEmail);

    expect(count).toBe(1);
    expect(mockSyncService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'applied', action: 'interview_invite' }),
    );
  });

  it('stores match as pending_review when confidence is below threshold', async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        jobRelated: true,
        applicationId: 'app-1',
        confidence: 0.7,
        action: 'rejection',
        newStatus: 'rejected',
        interviewAt: null,
        contactName: null,
        contactRole: null,
      }),
      toolCalls: [],
    });

    const { service, mockSyncService } = makeService();
    await service.triageEmail('user-1', sampleEmail);

    expect(mockSyncService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending_review' }),
    );
  });

  it('stores match as ignored when not job-related', async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        jobRelated: false,
        applicationId: null,
        confidence: 0.99,
        action: 'none',
        newStatus: null,
        interviewAt: null,
        contactName: null,
        contactRole: null,
      }),
      toolCalls: [],
    });

    const { service, mockSyncService } = makeService();
    const count = await service.triageEmail('user-1', sampleEmail);

    expect(count).toBe(0);
    expect(mockSyncService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ignored' }),
    );
  });

  it('overrides applicationId to null when LLM returns an unknown ID', async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        jobRelated: true,
        applicationId: 'nonexistent-uuid',
        confidence: 0.95,
        action: 'none',
        newStatus: null,
        interviewAt: null,
        contactName: null,
        contactRole: null,
      }),
      toolCalls: [],
    });

    const { service, mockSyncService } = makeService();
    await service.triageEmail('user-1', sampleEmail);

    expect(mockSyncService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: null, status: 'pending_review' }),
    );
  });

  it('stores as pending_review with error when LLM call fails', async () => {
    mockChatCompletion.mockRejectedValue(new Error('Ollama is down'));

    const { service, mockSyncService } = makeService();
    const count = await service.triageEmail('user-1', sampleEmail);

    expect(count).toBe(0);
    expect(mockSyncService.createMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ignored',
        classificationError: expect.stringContaining('Ollama is down'),
      }),
    );
  });
});
