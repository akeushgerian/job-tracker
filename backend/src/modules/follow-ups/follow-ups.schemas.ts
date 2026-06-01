import { z } from 'zod';

export const createFollowUpSchema = z.object({
  dueDate: z.iso.datetime(),
  description: z.string().min(1).max(2000),
  completed: z.boolean().default(false),
});

export const updateFollowUpSchema = z
  .object({
    dueDate: z.iso.datetime(),
    description: z.string().min(1).max(2000),
    completed: z.boolean(),
  })
  .partial();

export const followUpSchema = z.object({
  id: z.uuid(),
  applicationId: z.uuid(),
  dueDate: z.string(),
  description: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
});

export const followUpListSchema = z.array(followUpSchema);

export const applicationIdParamSchema = z.object({ applicationId: z.uuid() });
export const idParamSchema = z.object({ id: z.uuid() });

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
export type FollowUpDto = z.infer<typeof followUpSchema>;
