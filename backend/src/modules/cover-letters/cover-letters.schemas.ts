import { z } from 'zod';

export const generateCoverLetterSchema = z
  .object({
    applicationId: z.uuid().optional(),
    jobText: z.string().min(1).max(20000).optional(),
    jobUrl: z.url().max(2000).optional(),
    jobTitle: z.string().max(200).optional(),
    jobCompany: z.string().max(200).optional(),
    referenceId: z.uuid().optional(),
    referenceText: z.string().min(1).max(20000).optional(),
    tone: z.string().max(200).optional(),
  })
  .refine(
    (data) =>
      data.jobText !== undefined ||
      data.jobUrl !== undefined ||
      data.applicationId !== undefined,
    { message: 'Provide the job posting text, a URL, or an application', path: ['jobText'] },
  );

export const updateCoverLetterSchema = z.object({
  content: z.string().min(1).max(50000),
});

export const listCoverLettersQuerySchema = z.object({
  applicationId: z.uuid().optional(),
});

export const coverLetterSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  applicationId: z.string().nullable(),
  jobTitle: z.string().nullable(),
  jobCompany: z.string().nullable(),
  jobUrl: z.string().nullable(),
  jobText: z.string(),
  content: z.string(),
  model: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const coverLetterListSchema = z.array(coverLetterSchema);

export const createReferenceSchema = z.object({
  label: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
});

export const updateReferenceSchema = z
  .object({
    label: z.string().min(1).max(200),
    content: z.string().min(1).max(20000),
  })
  .partial();

export const referenceSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  label: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export const referenceListSchema = z.array(referenceSchema);

export const idParamSchema = z.object({ id: z.uuid() });

export type GenerateCoverLetterInput = z.infer<typeof generateCoverLetterSchema>;
export type UpdateCoverLetterInput = z.infer<typeof updateCoverLetterSchema>;
export type ListCoverLettersQuery = z.infer<typeof listCoverLettersQuerySchema>;
export type CoverLetterDto = z.infer<typeof coverLetterSchema>;
export type CreateReferenceInput = z.infer<typeof createReferenceSchema>;
export type UpdateReferenceInput = z.infer<typeof updateReferenceSchema>;
export type ReferenceDto = z.infer<typeof referenceSchema>;
