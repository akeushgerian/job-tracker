import type { Database } from '../../db/client.js';
import { assertApplicationOwned } from '../../lib/application-access.js';
import { FollowUpNotFoundError } from '../../lib/errors.js';
import type { FollowUpRow } from '../../db/schema.js';
import {
  FollowUpsRepository,
  type UpdateFollowUpData,
} from './follow-ups.repository.js';
import type {
  CreateFollowUpInput,
  FollowUpDto,
  UpdateFollowUpInput,
} from './follow-ups.schemas.js';

function toDto(row: FollowUpRow): FollowUpDto {
  return {
    id: row.id,
    applicationId: row.applicationId,
    dueDate: row.dueDate.toISOString(),
    description: row.description,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}

export class FollowUpsService {
  constructor(
    private readonly db: Database,
    private readonly repo: FollowUpsRepository,
  ) {}

  async listForApplication(userId: string, applicationId: string): Promise<FollowUpDto[]> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const rows = await this.repo.listByApplication(applicationId);
    return rows.map(toDto);
  }

  async create(
    userId: string,
    applicationId: string,
    input: CreateFollowUpInput,
  ): Promise<FollowUpDto> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const row = await this.repo.create(
      applicationId,
      {
        dueDate: new Date(input.dueDate),
        description: input.description,
        completed: input.completed,
      },
      { type: 'follow_up', description: `Follow-up scheduled: ${input.description}` },
    );
    return toDto(row);
  }

  async getById(userId: string, id: string): Promise<FollowUpDto> {
    const row = await this.repo.findById(userId, id);
    if (!row) throw new FollowUpNotFoundError(id);
    return toDto(row);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateFollowUpInput,
  ): Promise<FollowUpDto> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new FollowUpNotFoundError(id);

    const data: UpdateFollowUpData = {};
    if (input.dueDate !== undefined) data.dueDate = new Date(input.dueDate);
    if (input.description !== undefined) data.description = input.description;
    if (input.completed !== undefined) data.completed = input.completed;

    const row = await this.repo.update(id, data);
    if (!row) throw new FollowUpNotFoundError(id);
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new FollowUpNotFoundError(id);
    await this.repo.delete(id);
  }
}
