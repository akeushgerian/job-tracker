import { z } from 'zod';

export const aiSettingsSchema = z.object({
  provider: z.enum(['local', 'claude']),
  claudeApiKey: z.string().nullable(),
  claudeModel: z.string(),
});

export const updateAiSettingsSchema = z.object({
  provider: z.enum(['local', 'claude']),
  claudeApiKey: z.string().optional(),
  claudeModel: z.string().default('claude-haiku-4-5-20251001'),
});

export type AiSettingsDto = z.infer<typeof aiSettingsSchema>;
export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;
