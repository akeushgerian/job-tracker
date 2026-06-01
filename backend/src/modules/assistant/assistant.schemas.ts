import { z } from 'zod';

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(20000),
      }),
    )
    .min(1)
    .max(50),
});

export const proposedActionSchema = z.object({
  id: z.string(),
  tool: z.string(),
  description: z.string(),
  args: z.unknown(),
});

export const chatResponseSchema = z.object({
  reply: z.string(),
  steps: z.array(z.object({ tool: z.string(), summary: z.string() })),
  proposedActions: z.array(proposedActionSchema),
});

export const executeRequestSchema = z.object({
  tool: z.string().min(1),
  args: z.unknown(),
});

export const executeResponseSchema = z.object({
  ok: z.boolean(),
  result: z.unknown(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ExecuteRequest = z.infer<typeof executeRequestSchema>;
