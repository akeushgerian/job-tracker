import type { Database } from '../../db/client.js';
import { assertApplicationOwned } from '../../lib/application-access.js';
import type { ActivityRow } from '../../db/schema.js';
import { ActivitiesRepository } from './activities.repository.js';
import type { ActivityDto, CreateActivityInput } from './activities.schemas.js';

function toDto(row: ActivityRow): ActivityDto {
  return {
    id: row.id,
    applicationId: row.applicationId,
    type: row.type,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

export class ActivitiesService {
  constructor(
    private readonly db: Database,
    private readonly repo: ActivitiesRepository,
  ) {}

  async listForApplication(userId: string, applicationId: string): Promise<ActivityDto[]> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const rows = await this.repo.listByApplication(applicationId);
    return rows.map(toDto);
  }

  async create(
    userId: string,
    applicationId: string,
    input: CreateActivityInput,
  ): Promise<ActivityDto> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const row = await this.repo.create(applicationId, input.type, input.description);
    return toDto(row);
  }
}
