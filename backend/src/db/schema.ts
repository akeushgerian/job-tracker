import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// --- Enums ---

export const applicationStatusEnum = pgEnum('application_status', [
  'discovered',
  'applied',
  'recruiter_call',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
]);

export const remoteTypeEnum = pgEnum('remote_type', ['onsite', 'hybrid', 'remote']);

export const applicationSourceEnum = pgEnum('application_source', [
  'linkedin',
  'indeed',
  'instaffo',
  'direct',
  'referral',
  'recruiter',
]);

export const interviewTypeEnum = pgEnum('interview_type', [
  'recruiter_call',
  'technical',
  'final',
  'culture',
]);

export const interviewOutcomeEnum = pgEnum('interview_outcome', [
  'pending',
  'passed',
  'failed',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'status_change',
  'note',
  'email_sent',
  'email_received',
  'follow_up',
  'interview_scheduled',
]);

// --- Tables ---

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    positionTitle: text('position_title').notNull(),
    jobUrl: text('job_url'),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    location: text('location'),
    remoteType: remoteTypeEnum('remote_type'),
    status: applicationStatusEnum('status').notNull().default('discovered'),
    source: applicationSourceEnum('source'),
    recruiterName: text('recruiter_name'),
    recruiterEmail: text('recruiter_email'),
    notes: text('notes'),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('applications_user_id_idx').on(table.userId),
    index('applications_status_idx').on(table.status),
  ],
);

export const interviews = pgTable(
  'interviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    type: interviewTypeEnum('type').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    interviewerName: text('interviewer_name'),
    interviewerRole: text('interviewer_role'),
    completed: boolean('completed').notNull().default(false),
    outcome: interviewOutcomeEnum('outcome').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('interviews_application_id_idx').on(table.applicationId)],
);

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    type: activityTypeEnum('type').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('activities_application_id_idx').on(table.applicationId)],
);

export const followUps = pgTable(
  'follow_ups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    description: text('description').notNull(),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('follow_ups_application_id_idx').on(table.applicationId)],
);

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    role: text('role'),
    email: text('email'),
    phone: text('phone'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('contacts_application_id_idx').on(table.applicationId)],
);

export const userProfiles = pgTable(
  'user_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    headline: text('headline'),
    targetRole: text('target_role'),
    branch: text('branch'),
    seniority: text('seniority'),
    location: text('location'),
    remotePref: remoteTypeEnum('remote_pref'),
    skills: jsonb('skills').$type<string[]>().notNull().default([]),
    links: jsonb('links').$type<Record<string, string>>().notNull().default({}),
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_profiles_user_id_idx').on(table.userId)],
);

export const coverLetterReferences = pgTable(
  'cover_letter_references',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('cover_letter_references_user_id_idx').on(table.userId)],
);

export const coverLetters = pgTable(
  'cover_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    applicationId: uuid('application_id').references(() => applications.id, {
      onDelete: 'set null',
    }),
    jobTitle: text('job_title'),
    jobCompany: text('job_company'),
    jobUrl: text('job_url'),
    jobText: text('job_text').notNull(),
    content: text('content').notNull(),
    model: text('model'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('cover_letters_user_id_idx').on(table.userId),
    index('cover_letters_application_id_idx').on(table.applicationId),
  ],
);

// --- Inferred row types ---

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type ApplicationRow = typeof applications.$inferSelect;
export type NewApplicationRow = typeof applications.$inferInsert;
export type InterviewRow = typeof interviews.$inferSelect;
export type NewInterviewRow = typeof interviews.$inferInsert;
export type ActivityRow = typeof activities.$inferSelect;
export type NewActivityRow = typeof activities.$inferInsert;
export type FollowUpRow = typeof followUps.$inferSelect;
export type NewFollowUpRow = typeof followUps.$inferInsert;
export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
export type UserProfileRow = typeof userProfiles.$inferSelect;
export type NewUserProfileRow = typeof userProfiles.$inferInsert;
export type CoverLetterReferenceRow = typeof coverLetterReferences.$inferSelect;
export type NewCoverLetterReferenceRow = typeof coverLetterReferences.$inferInsert;
export type CoverLetterRow = typeof coverLetters.$inferSelect;
export type NewCoverLetterRow = typeof coverLetters.$inferInsert;
