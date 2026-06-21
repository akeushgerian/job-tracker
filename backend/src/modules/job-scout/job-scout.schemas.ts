import { z } from 'zod';

export const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
});

export const fetchAndScoreSchema = z.object({
  url: z.string().url(),
});

export const jobResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  snippet: z.string(),
  url: z.string(),
  created: z.string(),
  score: z.number().nullable(),
  fitNote: z.string().nullable(),
  gaps: z.array(z.string()),
});

export const scoringSkippedSchema = z.object({
  reason: z.enum(['no_profile', 'llm_error']),
});

export const searchResponseSchema = z.object({
  results: z.array(jobResultSchema),
  message: z.string().optional(),
  scoringSkipped: scoringSkippedSchema.optional(),
});

export const fetchAndScoreResponseSchema = z.object({
  score: z.number().nullable(),
  fitNote: z.string().nullable(),
  gaps: z.array(z.string()),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type JobResult = z.infer<typeof jobResultSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type FetchAndScoreResponse = z.infer<typeof fetchAndScoreResponseSchema>;
