import { z } from 'zod';
import { applicationStatusSchema } from '../applications/applications.schemas.js';
import { interviewTypeSchema } from '../interviews/interviews.schemas.js';

export const upcomingInterviewSchema = z.object({
  id: z.uuid(),
  applicationId: z.uuid(),
  companyName: z.string(),
  positionTitle: z.string(),
  type: interviewTypeSchema,
  scheduledAt: z.string(),
});

export const overdueFollowUpSchema = z.object({
  id: z.uuid(),
  applicationId: z.uuid(),
  companyName: z.string(),
  positionTitle: z.string(),
  description: z.string(),
  dueDate: z.string(),
});

export const dashboardStatsSchema = z.object({
  totals: z.object({
    total: z.number(),
    active: z.number(),
  }),
  byStatus: z.record(applicationStatusSchema, z.number()),
  responseRate: z.number(),
  averageTimeToResponseDays: z.number().nullable(),
  upcomingInterviews: z.array(upcomingInterviewSchema),
  overdueFollowUps: z.array(overdueFollowUpSchema),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
