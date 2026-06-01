import type { Database } from '../../db/client.js';
import { assertApplicationOwned } from '../../lib/application-access.js';
import { InterviewNotFoundError } from '../../lib/errors.js';
import type { InterviewRow } from '../../db/schema.js';
import {
  InterviewsRepository,
  type UpdateInterviewData,
} from './interviews.repository.js';
import type {
  CreateInterviewInput,
  InterviewDto,
  UpdateInterviewInput,
} from './interviews.schemas.js';

function toDto(row: InterviewRow): InterviewDto {
  return {
    id: row.id,
    applicationId: row.applicationId,
    type: row.type,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    durationMinutes: row.durationMinutes,
    notes: row.notes,
    interviewerName: row.interviewerName,
    interviewerRole: row.interviewerRole,
    completed: row.completed,
    outcome: row.outcome,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class InterviewsService {
  constructor(
    private readonly db: Database,
    private readonly repo: InterviewsRepository,
  ) {}

  async listForApplication(userId: string, applicationId: string): Promise<InterviewDto[]> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const rows = await this.repo.listByApplication(applicationId);
    return rows.map(toDto);
  }

  async create(
    userId: string,
    applicationId: string,
    input: CreateInterviewInput,
  ): Promise<InterviewDto> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const row = await this.repo.create(
      applicationId,
      {
        type: input.type,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        durationMinutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
        interviewerName: input.interviewerName ?? null,
        interviewerRole: input.interviewerRole ?? null,
        completed: input.completed,
        outcome: input.outcome,
      },
      {
        type: 'interview_scheduled',
        description: `Scheduled ${input.type} interview`,
      },
    );
    return toDto(row);
  }

  async getById(userId: string, id: string): Promise<InterviewDto> {
    const row = await this.repo.findById(userId, id);
    if (!row) throw new InterviewNotFoundError(id);
    return toDto(row);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateInterviewInput,
  ): Promise<InterviewDto> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new InterviewNotFoundError(id);

    const data: UpdateInterviewData = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.scheduledAt !== undefined) {
      data.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    }
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.interviewerName !== undefined) data.interviewerName = input.interviewerName;
    if (input.interviewerRole !== undefined) data.interviewerRole = input.interviewerRole;
    if (input.completed !== undefined) data.completed = input.completed;
    if (input.outcome !== undefined) data.outcome = input.outcome;

    const row = await this.repo.update(id, data);
    if (!row) throw new InterviewNotFoundError(id);
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new InterviewNotFoundError(id);
    await this.repo.delete(id);
  }
}
