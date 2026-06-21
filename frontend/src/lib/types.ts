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

export interface ProfileLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
}

export interface Profile {
  id: string;
  userId: string;
  headline: string | null;
  targetRole: string | null;
  branch: string | null;
  seniority: string | null;
  location: string | null;
  remotePref: RemoteType | null;
  skills: string[];
  links: ProfileLinks;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetter {
  id: string;
  userId: string;
  applicationId: string | null;
  jobTitle: string | null;
  jobCompany: string | null;
  jobUrl: string | null;
  jobText: string;
  content: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverLetterReference {
  id: string;
  userId: string;
  label: string;
  content: string;
  createdAt: string;
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
  source: string;
  emailMatchId: string | null;
  createdAt: string;
}

export type EmailMatchAction =
  | 'status_change'
  | 'interview_invite'
  | 'offer'
  | 'rejection'
  | 'follow_up'
  | 'none';

export type EmailMatchStatus = 'applied' | 'pending_review' | 'ignored';

export interface EmailMatch {
  id: string;
  userId: string;
  gmailMessageId: string;
  applicationId: string | null;
  subject: string;
  sender: string;
  snippet: string;
  receivedAt: string;
  action: EmailMatchAction;
  confidence: number;
  status: EmailMatchStatus;
  classificationError: string | null;
  createdAt: string;
}

export interface GmailStatus {
  connected: boolean;
  connectedEmail: string | null;
  lastSyncedAt: string | null;
  needsReauth: boolean;
}

export interface SyncAction {
  subject: string;
  sender: string;
  company: string | null;
  action: EmailMatchAction;
  confidence: number;
  status: 'applied' | 'pending_review';
}

export interface SyncResult {
  processed: number;
  matched: number;
  actions: SyncAction[];
}

export interface AiSettings {
  provider: 'local' | 'claude';
  claudeApiKey: string | null;
  claudeModel: string;
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

// --- Job Scout ---

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  snippet: string;
  url: string;
  created: string;
  score: number | null;
  fitNote: string | null;
  gaps: string[];
}

export interface SearchResponse {
  results: JobResult[];
  message?: string;
  scoringSkipped?: { reason: 'no_profile' | 'llm_error' };
}

export interface FetchAndScoreResponse {
  score: number | null;
  fitNote: string | null;
  gaps: string[];
}
