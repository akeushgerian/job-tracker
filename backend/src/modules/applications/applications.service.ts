import { ApplicationNotFoundError, InvalidStatusTransitionError } from '../../lib/errors.js';
import type { ApplicationRow } from '../../db/schema.js';
import {
  ApplicationsRepository,
  type UpdateApplicationData,
} from './applications.repository.js';
import { isValidTransition } from './status-transitions.js';
import type {
  ApplicationDto,
  ApplicationStatus,
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationInput,
} from './applications.schemas.js';

export interface PaginatedApplications {
  data: ApplicationDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

function toDto(row: ApplicationRow): ApplicationDto {
  return {
    id: row.id,
    userId: row.userId,
    companyName: row.companyName,
    positionTitle: row.positionTitle,
    jobUrl: row.jobUrl,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    location: row.location,
    remoteType: row.remoteType,
    status: row.status,
    source: row.source,
    recruiterName: row.recruiterName,
    recruiterEmail: row.recruiterEmail,
    notes: row.notes,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class ApplicationsService {
  constructor(private readonly repo: ApplicationsRepository) {}

  async create(userId: string, input: CreateApplicationInput): Promise<ApplicationDto> {
    const row = await this.repo.create(
      userId,
      {
        companyName: input.companyName,
        positionTitle: input.positionTitle,
        jobUrl: input.jobUrl ?? null,
        salaryMin: input.salaryMin ?? null,
        salaryMax: input.salaryMax ?? null,
        location: input.location ?? null,
        remoteType: input.remoteType ?? null,
        status: input.status,
        source: input.source ?? null,
        recruiterName: input.recruiterName ?? null,
        recruiterEmail: input.recruiterEmail ?? null,
        notes: input.notes ?? null,
        appliedAt: input.appliedAt ? new Date(input.appliedAt) : null,
      },
      {
        type: 'note',
        description: `Created application: ${input.positionTitle} at ${input.companyName}`,
      },
    );
    return toDto(row);
  }

  async getById(userId: string, id: string): Promise<ApplicationDto> {
    const row = await this.repo.findById(userId, id);
    if (!row) throw new ApplicationNotFoundError(id);
    return toDto(row);
  }

  async list(
    userId: string,
    query: ListApplicationsQuery,
  ): Promise<PaginatedApplications> {
    const { rows, total } = await this.repo.list(userId, query);
    return {
      data: rows.map(toDto),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async update(
    userId: string,
    id: string,
    input: UpdateApplicationInput,
  ): Promise<ApplicationDto> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new ApplicationNotFoundError(id);

    const data: UpdateApplicationData = {};
    if (input.companyName !== undefined) data.companyName = input.companyName;
    if (input.positionTitle !== undefined) data.positionTitle = input.positionTitle;
    if (input.jobUrl !== undefined) data.jobUrl = input.jobUrl;
    if (input.salaryMin !== undefined) data.salaryMin = input.salaryMin;
    if (input.salaryMax !== undefined) data.salaryMax = input.salaryMax;
    if (input.location !== undefined) data.location = input.location;
    if (input.remoteType !== undefined) data.remoteType = input.remoteType;
    if (input.source !== undefined) data.source = input.source;
    if (input.recruiterName !== undefined) data.recruiterName = input.recruiterName;
    if (input.recruiterEmail !== undefined) data.recruiterEmail = input.recruiterEmail;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.appliedAt !== undefined) {
      data.appliedAt = input.appliedAt ? new Date(input.appliedAt) : null;
    }

    const row = await this.repo.update(userId, id, data);
    if (!row) throw new ApplicationNotFoundError(id);
    return toDto(row);
  }

  async changeStatus(
    userId: string,
    id: string,
    status: ApplicationStatus,
  ): Promise<ApplicationDto> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new ApplicationNotFoundError(id);

    if (!isValidTransition(existing.status, status)) {
      throw new InvalidStatusTransitionError(existing.status, status);
    }

    const row = await this.repo.updateStatus(userId, id, status, {
      type: 'status_change',
      description: `Status changed from ${existing.status} to ${status}`,
    });
    if (!row) throw new ApplicationNotFoundError(id);
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.delete(userId, id);
    if (!deleted) throw new ApplicationNotFoundError(id);
  }
}
