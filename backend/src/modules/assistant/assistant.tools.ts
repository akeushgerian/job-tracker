import { z } from 'zod';
import type { AssistantDeps } from './assistant.deps.js';
import type { ToolDefinition } from './assistant.llm.js';
import { applicationStatusSchema } from '../applications/applications.schemas.js';
import { interviewTypeSchema } from '../interviews/interviews.schemas.js';

export interface AssistantTool {
  name: string;
  description: string;
  kind: 'read' | 'write';
  schema: z.ZodType;
  run: (userId: string, args: unknown, deps: AssistantDeps) => Promise<unknown>;
  describe: (args: unknown) => string;
}

const uuid = z.uuid();

const searchSchema = z.object({
  query: z.string().optional(),
  status: applicationStatusSchema.optional(),
});

const idSchema = z.object({ applicationId: uuid });

const createSchema = z.object({
  companyName: z.string().min(1),
  positionTitle: z.string().min(1),
  jobUrl: z.string().optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  remoteType: z.enum(['onsite', 'hybrid', 'remote']).optional(),
  source: z
    .enum(['linkedin', 'indeed', 'instaffo', 'direct', 'referral', 'recruiter'])
    .optional(),
  notes: z.string().optional(),
  appliedAt: z.string().optional(),
});

const statusSchema = z.object({
  applicationId: uuid,
  status: applicationStatusSchema,
});

const followUpSchema = z.object({
  applicationId: uuid,
  dueDate: z.string(),
  description: z.string().min(1),
});

const interviewSchema = z.object({
  applicationId: uuid,
  type: interviewTypeSchema,
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  interviewerName: z.string().optional(),
  notes: z.string().optional(),
});

const noteSchema = z.object({
  applicationId: uuid,
  description: z.string().min(1),
});

export const ASSISTANT_TOOLS: AssistantTool[] = [
  {
    name: 'search_applications',
    description:
      'Search the user\'s job applications. Optionally filter by a text query (company or position) and/or a status. Returns a compact list.',
    kind: 'read',
    schema: searchSchema,
    describe: () => 'Search applications',
    run: async (userId, args, deps) => {
      const { query, status } = searchSchema.parse(args);
      const result = await deps.applications.list(userId, {
        q: query,
        status,
        page: 1,
        pageSize: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      return result.data.map((a) => ({
        id: a.id,
        company: a.companyName,
        position: a.positionTitle,
        status: a.status,
        location: a.location,
      }));
    },
  },
  {
    name: 'get_application_details',
    description:
      'Get full details for one application by id, including its interviews, contacts, follow-ups, and recent activity.',
    kind: 'read',
    schema: idSchema,
    describe: () => 'Get application details',
    run: async (userId, args, deps) => {
      const { applicationId } = idSchema.parse(args);
      const [application, interviews, contacts, followUps, activities] =
        await Promise.all([
          deps.applications.getById(userId, applicationId),
          deps.interviews.listForApplication(userId, applicationId),
          deps.contacts.listForApplication(userId, applicationId),
          deps.followUps.listForApplication(userId, applicationId),
          deps.activities.listForApplication(userId, applicationId),
        ]);
      return { application, interviews, contacts, followUps, activities: activities.slice(0, 10) };
    },
  },
  {
    name: 'get_dashboard_stats',
    description:
      'Get aggregate stats: totals, counts by status, response rate, average time to response, upcoming interviews, and overdue follow-ups.',
    kind: 'read',
    schema: z.object({}),
    describe: () => 'Get dashboard stats',
    run: (userId, _args, deps) => deps.dashboard.getStats(userId),
  },
  {
    name: 'create_application',
    description:
      'Create a new job application. Use this when the user describes or pastes a job posting. Extract as many fields as possible.',
    kind: 'write',
    schema: createSchema,
    describe: (args) => {
      const a = createSchema.parse(args);
      return `Create application: ${a.positionTitle} at ${a.companyName}`;
    },
    run: (userId, args, deps) => {
      const input = createSchema.parse(args);
      return deps.applications.create(userId, { ...input, status: 'discovered' });
    },
  },
  {
    name: 'change_status',
    description:
      'Move an application to a new pipeline status. Only adjacent forward moves, or rejected/withdrawn, are allowed.',
    kind: 'write',
    schema: statusSchema,
    describe: (args) => {
      const a = statusSchema.parse(args);
      return `Change status to "${a.status}"`;
    },
    run: (userId, args, deps) => {
      const { applicationId, status } = statusSchema.parse(args);
      return deps.applications.changeStatus(userId, applicationId, status);
    },
  },
  {
    name: 'add_follow_up',
    description: 'Add a follow-up reminder with a due date (ISO 8601) to an application.',
    kind: 'write',
    schema: followUpSchema,
    describe: (args) => {
      const a = followUpSchema.parse(args);
      return `Add follow-up "${a.description}" due ${a.dueDate}`;
    },
    run: (userId, args, deps) => {
      const { applicationId, ...input } = followUpSchema.parse(args);
      return deps.followUps.create(userId, applicationId, { ...input, completed: false });
    },
  },
  {
    name: 'add_interview',
    description: 'Schedule an interview for an application.',
    kind: 'write',
    schema: interviewSchema,
    describe: (args) => {
      const a = interviewSchema.parse(args);
      return `Add ${a.type} interview`;
    },
    run: (userId, args, deps) => {
      const { applicationId, ...input } = interviewSchema.parse(args);
      return deps.interviews.create(userId, applicationId, {
        ...input,
        completed: false,
        outcome: 'pending',
      });
    },
  },
  {
    name: 'add_note',
    description: 'Add a free-text note to an application timeline.',
    kind: 'write',
    schema: noteSchema,
    describe: (args) => {
      const a = noteSchema.parse(args);
      return `Add note: ${a.description.slice(0, 60)}`;
    },
    run: (userId, args, deps) => {
      const { applicationId, description } = noteSchema.parse(args);
      return deps.activities.create(userId, applicationId, { type: 'note', description });
    },
  },
];

export function findTool(name: string): AssistantTool | undefined {
  return ASSISTANT_TOOLS.find((t) => t.name === name);
}

export function toolDefinitions(): ToolDefinition[] {
  return ASSISTANT_TOOLS.map((tool) => {
    const json = z.toJSONSchema(tool.schema) as Record<string, unknown>;
    delete json.$schema;
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: json,
      },
    };
  });
}
