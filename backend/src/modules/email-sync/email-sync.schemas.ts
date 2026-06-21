import { z } from 'zod';

export const gmailStatusSchema = z.object({
  connected: z.boolean(),
  connectedEmail: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  needsReauth: z.boolean(),
});

export const syncActionSchema = z.object({
  subject: z.string(),
  sender: z.string(),
  company: z.string().nullable(),
  action: z.enum(['status_change', 'interview_invite', 'offer', 'rejection', 'follow_up', 'none'] as const),
  confidence: z.number(),
  status: z.enum(['applied', 'pending_review'] as const),
});

export const syncResultSchema = z.object({
  processed: z.number().int(),
  matched: z.number().int(),
  actions: z.array(syncActionSchema),
});

export const emailMatchActionValues = [
  'status_change',
  'interview_invite',
  'offer',
  'rejection',
  'follow_up',
  'none',
] as const;

export const emailMatchStatusValues = ['applied', 'pending_review', 'ignored'] as const;

export const emailMatchSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  gmailMessageId: z.string(),
  applicationId: z.uuid().nullable(),
  subject: z.string(),
  sender: z.string(),
  snippet: z.string(),
  receivedAt: z.string(),
  action: z.enum(emailMatchActionValues),
  confidence: z.number(),
  status: z.enum(emailMatchStatusValues),
  classificationError: z.string().nullable(),
  createdAt: z.string(),
});

export const emailMatchListSchema = z.array(emailMatchSchema);

export const matchIdParamSchema = z.object({ id: z.uuid() });

export const listMatchesQuerySchema = z.object({
  applicationId: z.uuid().optional(),
});

export type GmailStatusDto = z.infer<typeof gmailStatusSchema>;
export type SyncResultDto = z.infer<typeof syncResultSchema>;
export type SyncActionDto = z.infer<typeof syncActionSchema>;
export type EmailMatchDto = z.infer<typeof emailMatchSchema>;
