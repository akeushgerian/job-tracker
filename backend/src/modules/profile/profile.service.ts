import type { UserProfileRow } from '../../db/schema.js';
import { ProfileRepository } from './profile.repository.js';
import type { ProfileDto, SaveProfileInput } from './profile.schemas.js';

function toDto(row: UserProfileRow): ProfileDto {
  return {
    id: row.id,
    userId: row.userId,
    headline: row.headline,
    targetRole: row.targetRole,
    branch: row.branch,
    seniority: row.seniority,
    location: row.location,
    remotePref: row.remotePref,
    skills: row.skills ?? [],
    links: row.links ?? {},
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class ProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  async get(userId: string): Promise<ProfileDto | null> {
    const row = await this.repo.findByUserId(userId);
    return row ? toDto(row) : null;
  }

  async save(userId: string, input: SaveProfileInput): Promise<ProfileDto> {
    const row = await this.repo.upsert(userId, {
      headline: input.headline ?? null,
      targetRole: input.targetRole ?? null,
      branch: input.branch ?? null,
      seniority: input.seniority ?? null,
      location: input.location ?? null,
      remotePref: input.remotePref ?? null,
      skills: input.skills,
      links: input.links,
      summary: input.summary ?? null,
    });
    return toDto(row);
  }
}
