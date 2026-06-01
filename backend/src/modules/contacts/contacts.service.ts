import type { Database } from '../../db/client.js';
import { assertApplicationOwned } from '../../lib/application-access.js';
import { ContactNotFoundError } from '../../lib/errors.js';
import type { ContactRow } from '../../db/schema.js';
import { ContactsRepository, type UpdateContactData } from './contacts.repository.js';
import type {
  ContactDto,
  CreateContactInput,
  UpdateContactInput,
} from './contacts.schemas.js';

function toDto(row: ContactRow): ContactDto {
  return {
    id: row.id,
    applicationId: row.applicationId,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export class ContactsService {
  constructor(
    private readonly db: Database,
    private readonly repo: ContactsRepository,
  ) {}

  async listForApplication(userId: string, applicationId: string): Promise<ContactDto[]> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const rows = await this.repo.listByApplication(applicationId);
    return rows.map(toDto);
  }

  async create(
    userId: string,
    applicationId: string,
    input: CreateContactInput,
  ): Promise<ContactDto> {
    await assertApplicationOwned(this.db, userId, applicationId);
    const row = await this.repo.create(
      applicationId,
      {
        name: input.name,
        role: input.role ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
      },
      { type: 'note', description: `Added contact ${input.name}` },
    );
    return toDto(row);
  }

  async getById(userId: string, id: string): Promise<ContactDto> {
    const row = await this.repo.findById(userId, id);
    if (!row) throw new ContactNotFoundError(id);
    return toDto(row);
  }

  async update(
    userId: string,
    id: string,
    input: UpdateContactInput,
  ): Promise<ContactDto> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new ContactNotFoundError(id);

    const data: UpdateContactData = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role;
    if (input.email !== undefined) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.notes !== undefined) data.notes = input.notes;

    const row = await this.repo.update(id, data);
    if (!row) throw new ContactNotFoundError(id);
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findById(userId, id);
    if (!existing) throw new ContactNotFoundError(id);
    await this.repo.delete(id);
  }
}
