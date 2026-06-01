import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApplicationStatus, InterviewType } from '@/lib/types';

export interface DashboardStats {
  totals: { total: number; active: number };
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
  averageTimeToResponseDays: number | null;
  upcomingInterviews: {
    id: string;
    applicationId: string;
    companyName: string;
    positionTitle: string;
    type: InterviewType;
    scheduledAt: string;
  }[];
  overdueFollowUps: {
    id: string;
    applicationId: string;
    companyName: string;
    positionTitle: string;
    description: string;
    dueDate: string;
  }[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
  });
}
