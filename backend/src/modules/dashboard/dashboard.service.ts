import { applicationStatusValues } from '../applications/applications.schemas.js';
import type { ApplicationStatus } from '../applications/applications.schemas.js';
import { DashboardRepository } from './dashboard.repository.js';
import type { DashboardStats } from './dashboard.schemas.js';

const ACTIVE_STATUSES: ApplicationStatus[] = [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
];

// A "response" is any movement past the applied stage, including a rejection.
const RESPONDED_STATUSES: ApplicationStatus[] = [
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
  'rejected',
];

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const [counts, avgDays, upcoming, overdue] = await Promise.all([
      this.repo.countByStatus(userId),
      this.repo.averageTimeToResponseDays(userId),
      this.repo.upcomingInterviews(userId, 5),
      this.repo.overdueFollowUps(userId),
    ]);

    const byStatus = Object.fromEntries(
      applicationStatusValues.map((s) => [s, 0]),
    ) as Record<ApplicationStatus, number>;
    for (const { status, count } of counts) {
      byStatus[status] = count;
    }

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    const active = ACTIVE_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
    const appliedCount = total - byStatus.discovered;
    const respondedCount = RESPONDED_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
    const responseRate = appliedCount > 0 ? respondedCount / appliedCount : 0;

    return {
      totals: { total, active },
      byStatus,
      responseRate,
      averageTimeToResponseDays:
        avgDays === null ? null : Math.round(avgDays * 10) / 10,
      upcomingInterviews: upcoming.map((i) => ({
        id: i.id,
        applicationId: i.applicationId,
        companyName: i.companyName,
        positionTitle: i.positionTitle,
        type: i.type as DashboardStats['upcomingInterviews'][number]['type'],
        scheduledAt: i.scheduledAt.toISOString(),
      })),
      overdueFollowUps: overdue.map((f) => ({
        id: f.id,
        applicationId: f.applicationId,
        companyName: f.companyName,
        positionTitle: f.positionTitle,
        description: f.description,
        dueDate: f.dueDate.toISOString(),
      })),
    };
  }
}
