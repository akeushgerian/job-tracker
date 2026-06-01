import { z } from 'zod';

export const interviewTypeValues = [
  'recruiter_call',
  'technical',
  'final',
  'culture',
] as const;

export const interviewOutcomeValues = ['pending', 'passed', 'failed'] as const;

export const interviewTypeSchema = z.enum(interviewTypeValues);
export const interviewOutcomeSchema = z.enum(interviewOutcomeValues);

export const createInterviewSchema = z.object({
  type: interviewTypeSchema,
  scheduledAt: z.iso.datetime().optional(),
  durationMinutes: z.number().int().positive().max(1440).optional(),
  notes: z.string().max(10000).optional(),
  interviewerName: z.string().max(200).optional(),
  interviewerRole: z.string().max(200).optional(),
  completed: z.boolean().default(false),
  outcome: interviewOutcomeSchema.default('pending'),
});

export const updateInterviewSchema = z
  .object({
    type: interviewTypeSchema,
    scheduledAt: z.iso.datetime().nullable(),
    durationMinutes: z.number().int().positive().max(1440).nullable(),
    notes: z.string().max(10000).nullable(),
    interviewerName: z.string().max(200).nullable(),
    interviewerRole: z.string().max(200).nullable(),
    completed: z.boolean(),
    outcome: interviewOutcomeSchema,
  })
  .partial();

export const interviewSchema = z.object({
  id: z.uuid(),
  applicationId: z.uuid(),
  type: interviewTypeSchema,
  scheduledAt: z.string().nullable(),
  durationMinutes: z.number().nullable(),
  notes: z.string().nullable(),
  interviewerName: z.string().nullable(),
  interviewerRole: z.string().nullable(),
  completed: z.boolean(),
  outcome: interviewOutcomeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const interviewListSchema = z.array(interviewSchema);

export const applicationIdParamSchema = z.object({ applicationId: z.uuid() });
export const idParamSchema = z.object({ id: z.uuid() });

export type InterviewType = z.infer<typeof interviewTypeSchema>;
export type InterviewOutcome = z.infer<typeof interviewOutcomeSchema>;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
export type InterviewDto = z.infer<typeof interviewSchema>;
