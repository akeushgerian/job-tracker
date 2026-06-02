import { z } from 'zod';
import { remoteTypeSchema } from '../applications/applications.schemas.js';

export const profileLinksSchema = z.object({
  linkedin: z.url().max(2000).optional(),
  github: z.url().max(2000).optional(),
  portfolio: z.url().max(2000).optional(),
  website: z.url().max(2000).optional(),
});

export const saveProfileSchema = z.object({
  headline: z.string().max(200).nullish(),
  targetRole: z.string().max(200).nullish(),
  branch: z.string().max(200).nullish(),
  seniority: z.string().max(100).nullish(),
  location: z.string().max(200).nullish(),
  remotePref: remoteTypeSchema.nullish(),
  skills: z.array(z.string().min(1).max(100)).max(100).default([]),
  links: profileLinksSchema.default({}),
  summary: z.string().max(20000).nullish(),
});

export const profileSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  headline: z.string().nullable(),
  targetRole: z.string().nullable(),
  branch: z.string().nullable(),
  seniority: z.string().nullable(),
  location: z.string().nullable(),
  remotePref: remoteTypeSchema.nullable(),
  skills: z.array(z.string()),
  links: profileLinksSchema,
  summary: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// GET returns the profile or null when the user has not created one yet.
export const profileResponseSchema = z.union([profileSchema, z.null()]);

export type SaveProfileInput = z.infer<typeof saveProfileSchema>;
export type ProfileDto = z.infer<typeof profileSchema>;
export type ProfileLinks = z.infer<typeof profileLinksSchema>;
