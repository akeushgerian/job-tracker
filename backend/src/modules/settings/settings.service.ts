import { encrypt, decrypt } from '../../lib/token-crypto.js';
import { SettingsRepository } from './settings.repository.js';
import type { AiSettingsDto, UpdateAiSettingsInput } from './settings.schemas.js';

const MASKED = '••••••••';

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async getAiSettings(userId: string): Promise<AiSettingsDto | null> {
    const row = await this.repo.getAiSettings(userId);
    if (!row) return null;
    return {
      provider: row.provider as AiSettingsDto['provider'],
      claudeApiKey: row.claudeApiKey ? MASKED : null,
      claudeModel: row.claudeModel,
    };
  }

  async updateAiSettings(userId: string, input: UpdateAiSettingsInput): Promise<AiSettingsDto> {
    let encryptedKey: string | null = null;

    if (input.provider === 'claude' && input.claudeApiKey && input.claudeApiKey.trim() !== '') {
      encryptedKey = encrypt(input.claudeApiKey);
    } else if (input.provider === 'claude') {
      // Keep existing key if no new one provided
      const existing = await this.repo.getAiSettings(userId);
      encryptedKey = existing?.claudeApiKey ?? null;
    }

    const row = await this.repo.upsertAiSettings(userId, {
      provider: input.provider,
      claudeApiKey: encryptedKey,
      claudeModel: input.claudeModel,
    });

    return {
      provider: row.provider as AiSettingsDto['provider'],
      claudeApiKey: row.claudeApiKey ? MASKED : null,
      claudeModel: row.claudeModel,
    };
  }

  async getDecryptedApiKey(userId: string): Promise<string | null> {
    const row = await this.repo.getAiSettings(userId);
    if (!row?.claudeApiKey) return null;
    try {
      return decrypt(row.claudeApiKey);
    } catch {
      return null;
    }
  }
}
