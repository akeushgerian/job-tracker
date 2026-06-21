import { z } from 'zod';

export const activityTypeValues = [
  'status_change',
  'note',
  'email_sent',
  'email_received',
  'follow_up',
  'interview_scheduled',
] as const;

export const activityTypeSchema = z.enum(activityTypeValues);

// Types a user may add manually to the timeline. `status_change` and
// `interview_scheduled` are produced by the system, not by this endpoint.
export const manualActivityTypeSchema = z.enum([
  'note',
  'email_sent',
  'email_received',
  'follow_up',
]);

export const createActivitySchema = z.object({
  type: manualActivityTypeSchema,
  description: z.string().min(1).max(2000),
});

export const activitySchema = z.object({
  id: z.uuid(),
  applicationId: z.uuid(),
  type: activityTypeSchema,
  description: z.string(),
  source: z.string(),
  emailMatchId: z.uuid().nullable(),
  createdAt: z.string(),
});

export const activityListSchema = z.array(activitySchema);

export const applicationIdParamSchema = z.object({
  applicationId: z.uuid(),
});

export type ActivityDto = z.infer<typeof activitySchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
