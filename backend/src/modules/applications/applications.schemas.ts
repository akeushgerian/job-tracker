import { z } from 'zod';

export const applicationStatusValues = [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
] as const;

export const remoteTypeValues = ['onsite', 'hybrid', 'remote'] as const;

export const applicationSourceValues = [
  'linkedin',
  'indeed',
  'instaffo',
  'direct',
  'referral',
  'recruiter',
] as const;

export const applicationStatusSchema = z.enum(applicationStatusValues);
export const remoteTypeSchema = z.enum(remoteTypeValues);
export const applicationSourceSchema = z.enum(applicationSourceValues);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

const salary = z.number().int().nonnegative();

export const createApplicationSchema = z
  .object({
    companyName: z.string().min(1).max(200),
    positionTitle: z.string().min(1).max(200),
    jobUrl: z.url().max(2000).optional(),
    salaryMin: salary.optional(),
    salaryMax: salary.optional(),
    location: z.string().max(200).optional(),
    remoteType: remoteTypeSchema.optional(),
    status: applicationStatusSchema.default('discovered'),
    source: applicationSourceSchema.optional(),
    recruiterName: z.string().max(200).optional(),
    recruiterEmail: z.email().max(200).optional(),
    notes: z.string().max(10000).optional(),
    appliedAt: z.iso.datetime().optional(),
  })
  .refine(
    (data) =>
      data.salaryMin === undefined ||
      data.salaryMax === undefined ||
      data.salaryMax >= data.salaryMin,
    { message: 'salaryMax must be greater than or equal to salaryMin', path: ['salaryMax'] },
  );

// Update: every field optional, status excluded (transitions use a dedicated route).
export const updateApplicationSchema = z
  .object({
    companyName: z.string().min(1).max(200),
    positionTitle: z.string().min(1).max(200),
    jobUrl: z.url().max(2000).nullable(),
    salaryMin: salary.nullable(),
    salaryMax: salary.nullable(),
    location: z.string().max(200).nullable(),
    remoteType: remoteTypeSchema.nullable(),
    source: applicationSourceSchema.nullable(),
    recruiterName: z.string().max(200).nullable(),
    recruiterEmail: z.email().max(200).nullable(),
    notes: z.string().max(10000).nullable(),
    appliedAt: z.iso.datetime().nullable(),
  })
  .partial();

export const updateStatusSchema = z.object({
  status: applicationStatusSchema,
});

export const listApplicationsQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'companyName', 'appliedAt', 'status'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});

export const applicationSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  companyName: z.string(),
  positionTitle: z.string(),
  jobUrl: z.string().nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  location: z.string().nullable(),
  remoteType: remoteTypeSchema.nullable(),
  status: applicationStatusSchema,
  source: applicationSourceSchema.nullable(),
  recruiterName: z.string().nullable(),
  recruiterEmail: z.string().nullable(),
  notes: z.string().nullable(),
  appliedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const paginatedApplicationsSchema = z.object({
  data: z.array(applicationSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type ApplicationDto = z.infer<typeof applicationSchema>;
