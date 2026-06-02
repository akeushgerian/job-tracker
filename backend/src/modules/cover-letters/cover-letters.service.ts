import { config } from '../../config/index.js';
import {
  CoverLetterNotFoundError,
  CoverLetterReferenceNotFoundError,
  ProfileRequiredError,
  ValidationError,
} from '../../lib/errors.js';
import { fetchJobPosting } from '../../lib/job-fetch.js';
import type { CoverLetterReferenceRow, CoverLetterRow } from '../../db/schema.js';
import { chatCompletion } from '../assistant/assistant.llm.js';
import type { ApplicationsService } from '../applications/applications.service.js';
import type { ApplicationDto } from '../applications/applications.schemas.js';
import type { ProfileService } from '../profile/profile.service.js';
import { buildCoverLetterMessages } from './cover-letters.prompt.js';
import { CoverLettersRepository } from './cover-letters.repository.js';
import type {
  CoverLetterDto,
  GenerateCoverLetterInput,
  ReferenceDto,
} from './cover-letters.schemas.js';

function toDto(row: CoverLetterRow): CoverLetterDto {
  return {
    id: row.id,
    userId: row.userId,
    applicationId: row.applicationId,
    jobTitle: row.jobTitle,
    jobCompany: row.jobCompany,
    jobUrl: row.jobUrl,
    jobText: row.jobText,
    content: row.content,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function referenceToDto(row: CoverLetterReferenceRow): ReferenceDto {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function jobTextFromApplication(app: ApplicationDto): string {
  const lines = [
    `Position: ${app.positionTitle}`,
    `Company: ${app.companyName}`,
    app.location ? `Location: ${app.location}` : null,
    app.remoteType ? `Remote: ${app.remoteType}` : null,
    app.notes ? `\n${app.notes}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export class CoverLettersService {
  constructor(
    private readonly repo: CoverLettersRepository,
    private readonly profiles: ProfileService,
    private readonly applications: ApplicationsService,
  ) {}

  async generate(
    userId: string,
    input: GenerateCoverLetterInput,
  ): Promise<CoverLetterDto> {
    const profile = await this.profiles.get(userId);
    if (!profile) throw new ProfileRequiredError();

    // getById enforces ownership (throws 404 when the application is not the user's).
    const application = input.applicationId
      ? await this.applications.getById(userId, input.applicationId)
      : null;

    const jobText = await this.resolveJobText(input, application);
    const referenceText = await this.resolveReferenceText(userId, input);

    const jobTitle = input.jobTitle ?? application?.positionTitle ?? null;
    const jobCompany = input.jobCompany ?? application?.companyName ?? null;

    const messages = buildCoverLetterMessages({
      profile,
      jobText,
      jobTitle,
      jobCompany,
      referenceText,
      tone: input.tone ?? null,
    });

    const result = await chatCompletion(messages, []);
    const content = result.content.trim();
    if (!content) {
      throw new ValidationError('The model returned an empty cover letter, try again');
    }

    const row = await this.repo.create(userId, {
      applicationId: application?.id ?? null,
      jobTitle,
      jobCompany,
      jobUrl: input.jobUrl ?? application?.jobUrl ?? null,
      jobText,
      content,
      model: config.LLM_MODEL,
    });
    return toDto(row);
  }

  private async resolveJobText(
    input: GenerateCoverLetterInput,
    application: ApplicationDto | null,
  ): Promise<string> {
    if (input.jobText) return input.jobText;
    if (input.jobUrl) return fetchJobPosting(input.jobUrl);
    if (application) return jobTextFromApplication(application);
    throw new ValidationError('Provide the job posting text, a URL, or an application');
  }

  private async resolveReferenceText(
    userId: string,
    input: GenerateCoverLetterInput,
  ): Promise<string | null> {
    if (input.referenceText) return input.referenceText;
    if (input.referenceId) {
      const ref = await this.repo.findReferenceById(userId, input.referenceId);
      if (!ref) throw new CoverLetterReferenceNotFoundError(input.referenceId);
      return ref.content;
    }
    return null;
  }

  async list(userId: string, applicationId?: string): Promise<CoverLetterDto[]> {
    const rows = await this.repo.list(userId, applicationId);
    return rows.map(toDto);
  }

  async getById(userId: string, id: string): Promise<CoverLetterDto> {
    const row = await this.repo.findById(userId, id);
    if (!row) throw new CoverLetterNotFoundError(id);
    return toDto(row);
  }

  async updateContent(
    userId: string,
    id: string,
    content: string,
  ): Promise<CoverLetterDto> {
    const row = await this.repo.updateContent(userId, id, content);
    if (!row) throw new CoverLetterNotFoundError(id);
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.delete(userId, id);
    if (!deleted) throw new CoverLetterNotFoundError(id);
  }

  // --- References ---

  async listReferences(userId: string): Promise<ReferenceDto[]> {
    const rows = await this.repo.listReferences(userId);
    return rows.map(referenceToDto);
  }

  async createReference(
    userId: string,
    data: { label: string; content: string },
  ): Promise<ReferenceDto> {
    const row = await this.repo.createReference(userId, data);
    return referenceToDto(row);
  }

  async updateReference(
    userId: string,
    id: string,
    data: Partial<{ label: string; content: string }>,
  ): Promise<ReferenceDto> {
    const row = await this.repo.updateReference(userId, id, data);
    if (!row) throw new CoverLetterReferenceNotFoundError(id);
    return referenceToDto(row);
  }

  async removeReference(userId: string, id: string): Promise<void> {
    const deleted = await this.repo.deleteReference(userId, id);
    if (!deleted) throw new CoverLetterReferenceNotFoundError(id);
  }
}
