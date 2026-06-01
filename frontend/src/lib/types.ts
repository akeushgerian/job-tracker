export type ApplicationStatus =
  | 'discovered'
  | 'applied'
  | 'recruiter_call'
  | 'technical_interview'
  | 'final_interview'
  | 'offer'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type RemoteType = 'onsite' | 'hybrid' | 'remote';

export type ApplicationSource =
  | 'linkedin'
  | 'indeed'
  | 'instaffo'
  | 'direct'
  | 'referral'
  | 'recruiter';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  positionTitle: string;
  jobUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remoteType: RemoteType | null;
  status: ApplicationStatus;
  source: ApplicationSource | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export type InterviewType = 'recruiter_call' | 'technical' | 'final' | 'culture';
export type InterviewOutcome = 'pending' | 'passed' | 'failed';

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  scheduledAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  interviewerName: string | null;
  interviewerRole: string | null;
  completed: boolean;
  outcome: InterviewOutcome;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  applicationId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  applicationId: string;
  dueDate: string;
  description: string;
  completed: boolean;
  createdAt: string;
}

export type ActivityType =
  | 'status_change'
  | 'note'
  | 'email_sent'
  | 'email_received'
  | 'follow_up'
  | 'interview_scheduled';

export interface Activity {
  id: string;
  applicationId: string;
  type: ActivityType;
  description: string;
  createdAt: string;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  discovered: 'Discovered',
  applied: 'Applied',
  recruiter_call: 'Recruiter Call',
  technical_interview: 'Technical',
  final_interview: 'Final',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// Columns shown in the Kanban pipeline, in order.
export const PIPELINE_STATUSES: ApplicationStatus[] = [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
];

export const TERMINAL_STATUSES: ApplicationStatus[] = [
  'accepted',
  'rejected',
  'withdrawn',
];
