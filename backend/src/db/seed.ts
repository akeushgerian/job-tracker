import { eq } from 'drizzle-orm';
import { db, closeDb } from './client.js';
import { hashPassword } from '../lib/password.js';
import {
  activities,
  applications,
  contacts,
  coverLetterReferences,
  coverLetters,
  followUps,
  interviews,
  userProfiles,
  users,
  type ActivityRow,
  type ApplicationRow,
  type InterviewRow,
} from './schema.js';

const DEMO_EMAIL = 'recruiter@laufbahn.app';
const DEMO_PASSWORD = 'laufbahn-demo';
const DEMO_NAME = 'Alex Mara';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (n: number): Date => new Date(now - n * DAY);
const daysFromNow = (n: number): Date => new Date(now + n * DAY);

interface SeedInterview {
  type: InterviewRow['type'];
  scheduledAt: Date | null;
  durationMinutes?: number;
  interviewerName?: string;
  interviewerRole?: string;
  notes?: string;
  completed?: boolean;
  outcome?: InterviewRow['outcome'];
}

interface SeedContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface SeedFollowUp {
  dueDate: Date;
  description: string;
  completed?: boolean;
}

interface SeedActivity {
  type: ActivityRow['type'];
  description: string;
  createdAt: Date;
}

interface SeedApplication {
  companyName: string;
  positionTitle: string;
  status: ApplicationRow['status'];
  jobUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  remoteType?: ApplicationRow['remoteType'];
  source?: ApplicationRow['source'];
  recruiterName?: string;
  recruiterEmail?: string;
  notes?: string;
  appliedAt?: Date;
  createdAt: Date;
  interviews?: SeedInterview[];
  contacts?: SeedContact[];
  followUps?: SeedFollowUp[];
  activities?: SeedActivity[];
}

const DEMO_APPLICATIONS: SeedApplication[] = [
  {
    companyName: 'Aurelia Systems',
    positionTitle: 'Senior Backend Engineer',
    status: 'discovered',
    jobUrl: 'https://example.com/jobs/aurelia-backend',
    salaryMin: 85000,
    salaryMax: 105000,
    location: 'Berlin, Germany',
    remoteType: 'hybrid',
    source: 'linkedin',
    notes: 'Node.js + Postgres platform team. Found via a LinkedIn post, looks promising.',
    createdAt: daysAgo(2),
    activities: [
      { type: 'note', description: 'Saved this role to review later.', createdAt: daysAgo(2) },
    ],
  },
  {
    companyName: 'Northwind Labs',
    positionTitle: 'Full-Stack Engineer',
    status: 'applied',
    jobUrl: 'https://example.com/jobs/northwind-fullstack',
    salaryMin: 78000,
    salaryMax: 95000,
    location: 'Remote (EU)',
    remoteType: 'remote',
    source: 'instaffo',
    notes: 'React + Fastify. Applied with a tailored cover letter.',
    appliedAt: daysAgo(6),
    createdAt: daysAgo(8),
    followUps: [
      { dueDate: daysFromNow(2), description: 'Follow up if no reply by end of week.' },
    ],
    activities: [
      { type: 'note', description: 'Created application from the job posting.', createdAt: daysAgo(8) },
      { type: 'status_change', description: 'Status changed from discovered to applied', createdAt: daysAgo(6) },
      { type: 'email_sent', description: 'Sent application + cover letter.', createdAt: daysAgo(6) },
    ],
  },
  {
    companyName: 'Vertex Mobility',
    positionTitle: 'Backend Engineer (Platform)',
    status: 'recruiter_call',
    salaryMin: 80000,
    salaryMax: 98000,
    location: 'Munich, Germany',
    remoteType: 'hybrid',
    source: 'recruiter',
    recruiterName: 'Sofia Klein',
    recruiterEmail: 'sofia.klein@example.com',
    notes: 'Recruiter reached out directly. Mobility / logistics domain.',
    appliedAt: daysAgo(14),
    createdAt: daysAgo(16),
    contacts: [
      {
        name: 'Sofia Klein',
        role: 'Technical Recruiter',
        email: 'sofia.klein@example.com',
        phone: '+49 151 2345678',
        notes: 'Very responsive, prefers email.',
      },
    ],
    interviews: [
      {
        type: 'recruiter_call',
        scheduledAt: daysAgo(3),
        durationMinutes: 30,
        interviewerName: 'Sofia Klein',
        interviewerRole: 'Technical Recruiter',
        notes: 'Intro call — went well, discussed salary range and team.',
        completed: true,
        outcome: 'passed',
      },
    ],
    followUps: [
      { dueDate: daysAgo(1), description: 'Send availability for the technical round.' },
    ],
    activities: [
      { type: 'status_change', description: 'Status changed from applied to recruiter_call', createdAt: daysAgo(4) },
      { type: 'interview_scheduled', description: 'Scheduled recruiter call with Sofia Klein.', createdAt: daysAgo(4) },
    ],
  },
  {
    companyName: 'Helios Health',
    positionTitle: 'Software Engineer, Backend',
    status: 'technical_interview',
    salaryMin: 82000,
    salaryMax: 100000,
    location: 'Hamburg, Germany',
    remoteType: 'onsite',
    source: 'direct',
    notes: 'Healthtech. Technical interview is a live coding + system design round.',
    appliedAt: daysAgo(21),
    createdAt: daysAgo(23),
    contacts: [
      { name: 'Daniel Roth', role: 'Engineering Manager', email: 'daniel.roth@example.com' },
    ],
    interviews: [
      {
        type: 'recruiter_call',
        scheduledAt: daysAgo(12),
        durationMinutes: 30,
        interviewerName: 'Lena Fischer',
        interviewerRole: 'Recruiter',
        completed: true,
        outcome: 'passed',
      },
      {
        type: 'technical',
        scheduledAt: daysFromNow(3),
        durationMinutes: 90,
        interviewerName: 'Daniel Roth',
        interviewerRole: 'Engineering Manager',
        notes: 'Live coding + system design. Prep: rate limiting, queues.',
        completed: false,
        outcome: 'pending',
      },
    ],
    followUps: [
      { dueDate: daysFromNow(1), description: 'Review system design notes before the round.' },
    ],
    activities: [
      { type: 'status_change', description: 'Status changed from recruiter_call to technical_interview', createdAt: daysAgo(7) },
      { type: 'interview_scheduled', description: 'Scheduled technical interview with Daniel Roth.', createdAt: daysAgo(7) },
    ],
  },
  {
    companyName: 'Orbit Finance',
    positionTitle: 'Senior Software Engineer',
    status: 'final_interview',
    salaryMin: 95000,
    salaryMax: 120000,
    location: 'Frankfurt, Germany',
    remoteType: 'hybrid',
    source: 'linkedin',
    recruiterName: 'Marco Bauer',
    recruiterEmail: 'marco.bauer@example.com',
    notes: 'Fintech. Final round is with the VP of Engineering.',
    appliedAt: daysAgo(30),
    createdAt: daysAgo(32),
    contacts: [
      { name: 'Marco Bauer', role: 'Senior Recruiter', email: 'marco.bauer@example.com' },
      { name: 'Priya Nair', role: 'VP Engineering', email: 'priya.nair@example.com' },
    ],
    interviews: [
      { type: 'recruiter_call', scheduledAt: daysAgo(24), durationMinutes: 30, completed: true, outcome: 'passed' },
      { type: 'technical', scheduledAt: daysAgo(14), durationMinutes: 90, interviewerName: 'Jonas Weber', completed: true, outcome: 'passed' },
      {
        type: 'final',
        scheduledAt: daysFromNow(5),
        durationMinutes: 60,
        interviewerName: 'Priya Nair',
        interviewerRole: 'VP Engineering',
        notes: 'Values + leadership conversation.',
        completed: false,
        outcome: 'pending',
      },
    ],
    followUps: [
      { dueDate: daysFromNow(4), description: 'Prepare questions for the VP.' },
    ],
    activities: [
      { type: 'status_change', description: 'Status changed from technical_interview to final_interview', createdAt: daysAgo(5) },
    ],
  },
  {
    companyName: 'Lumen Retail',
    positionTitle: 'Backend Engineer',
    status: 'offer',
    salaryMin: 88000,
    salaryMax: 102000,
    location: 'Remote (DE)',
    remoteType: 'remote',
    source: 'referral',
    recruiterName: 'Hannah Vogel',
    recruiterEmail: 'hannah.vogel@example.com',
    notes: 'Referred by a former colleague. Offer received — reviewing the details.',
    appliedAt: daysAgo(40),
    createdAt: daysAgo(42),
    contacts: [
      { name: 'Hannah Vogel', role: 'Talent Partner', email: 'hannah.vogel@example.com' },
    ],
    interviews: [
      { type: 'recruiter_call', scheduledAt: daysAgo(34), completed: true, outcome: 'passed' },
      { type: 'technical', scheduledAt: daysAgo(24), completed: true, outcome: 'passed' },
      { type: 'final', scheduledAt: daysAgo(10), completed: true, outcome: 'passed' },
    ],
    followUps: [
      { dueDate: daysFromNow(2), description: 'Respond to the offer by the deadline.' },
    ],
    activities: [
      { type: 'status_change', description: 'Status changed from final_interview to offer', createdAt: daysAgo(3) },
      { type: 'email_received', description: 'Received written offer with compensation details.', createdAt: daysAgo(3) },
    ],
  },
  {
    companyName: 'Cedar & Co.',
    positionTitle: 'Platform Engineer',
    status: 'accepted',
    salaryMin: 92000,
    salaryMax: 110000,
    location: 'Cologne, Germany',
    remoteType: 'hybrid',
    source: 'linkedin',
    notes: 'Accepted! Start date confirmed.',
    appliedAt: daysAgo(70),
    createdAt: daysAgo(72),
    interviews: [
      { type: 'recruiter_call', scheduledAt: daysAgo(64), completed: true, outcome: 'passed' },
      { type: 'technical', scheduledAt: daysAgo(54), completed: true, outcome: 'passed' },
      { type: 'final', scheduledAt: daysAgo(44), completed: true, outcome: 'passed' },
    ],
    activities: [
      { type: 'status_change', description: 'Status changed from offer to accepted', createdAt: daysAgo(40) },
      { type: 'note', description: 'Signed the contract. Start date set.', createdAt: daysAgo(40) },
    ],
  },
  {
    companyName: 'Pinecrest Media',
    positionTitle: 'Backend Developer',
    status: 'rejected',
    location: 'Remote (EU)',
    remoteType: 'remote',
    source: 'indeed',
    notes: 'Rejected after the technical round. Useful feedback on system design.',
    appliedAt: daysAgo(50),
    createdAt: daysAgo(52),
    interviews: [
      { type: 'recruiter_call', scheduledAt: daysAgo(44), completed: true, outcome: 'passed' },
      { type: 'technical', scheduledAt: daysAgo(34), completed: true, outcome: 'failed', notes: 'Struggled with the scaling question.' },
    ],
    activities: [
      { type: 'status_change', description: 'Status changed from technical_interview to rejected', createdAt: daysAgo(30) },
      { type: 'email_received', description: 'Received rejection email with feedback.', createdAt: daysAgo(30) },
    ],
  },
  {
    companyName: 'Quill Software',
    positionTitle: 'Software Engineer',
    status: 'withdrawn',
    location: 'Stuttgart, Germany',
    remoteType: 'onsite',
    source: 'recruiter',
    notes: 'Withdrew — onsite-only and the commute did not work out.',
    appliedAt: daysAgo(45),
    createdAt: daysAgo(47),
    activities: [
      { type: 'status_change', description: 'Status changed from applied to withdrawn', createdAt: daysAgo(38) },
      { type: 'note', description: 'Withdrew my application politely.', createdAt: daysAgo(38) },
    ],
  },
];

const DEMO_REFERENCES = [
  {
    label: 'My standard style',
    content: [
      'Dear Hiring Team,',
      '',
      'I was excited to come across the {role} position at {company}. With several years building reliable backend systems, I am drawn to the problems your team is solving.',
      '',
      'In my recent work I designed and shipped services handling significant traffic, focusing on clean APIs, observability, and pragmatic trade-offs. I care about code that other engineers can build on.',
      '',
      'I would welcome the chance to discuss how I can contribute. Thank you for your time and consideration.',
      '',
      'Warm regards,',
      'Alex Mara',
    ].join('\n'),
  },
];

async function seed(): Promise<void> {
  console.log(`Seeding demo data for ${DEMO_EMAIL} ...`);

  // Idempotent: remove any existing demo user; cascades clear all owned rows.
  await db.delete(users).where(eq(users.email, DEMO_EMAIL));

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: DEMO_NAME,
    })
    .returning();
  const userId = user!.id;

  await db.insert(userProfiles).values({
    userId,
    headline: 'Senior Backend Engineer',
    targetRole: 'Senior / Staff Backend Engineer',
    branch: 'Backend platforms · Fintech & SaaS',
    seniority: 'Senior',
    location: 'Berlin, Germany',
    remotePref: 'hybrid',
    skills: [
      'TypeScript',
      'Node.js',
      'Fastify',
      'PostgreSQL',
      'Drizzle ORM',
      'Docker',
      'AWS',
      'System Design',
    ],
    links: {
      linkedin: 'https://linkedin.com/in/alex-mara-demo',
      github: 'https://github.com/alex-mara-demo',
      portfolio: 'https://alexmara.example.com',
    },
    summary: [
      '## About',
      '',
      'Senior backend engineer with 7+ years building and operating production services in TypeScript and Node.js. I enjoy turning fuzzy requirements into clean, well-tested APIs and mentoring other engineers.',
      '',
      '## Highlights',
      '',
      '- Led the redesign of a payments service, cutting p99 latency by 40%.',
      '- Built an event-driven notifications platform handling millions of messages/day.',
      '- Strong advocate for observability, CI/CD, and incremental delivery.',
      '',
      '## What I am looking for',
      '',
      'A senior/staff backend role on a product-focused team that values quality, ownership, and a healthy remote/hybrid culture.',
    ].join('\n'),
  });

  const references = await db
    .insert(coverLetterReferences)
    .values(DEMO_REFERENCES.map((r) => ({ userId, label: r.label, content: r.content })))
    .returning();

  const appIdsByCompany = new Map<string, string>();

  for (const a of DEMO_APPLICATIONS) {
    const [appRow] = await db
      .insert(applications)
      .values({
        userId,
        companyName: a.companyName,
        positionTitle: a.positionTitle,
        jobUrl: a.jobUrl ?? null,
        salaryMin: a.salaryMin ?? null,
        salaryMax: a.salaryMax ?? null,
        location: a.location ?? null,
        remoteType: a.remoteType ?? null,
        status: a.status,
        source: a.source ?? null,
        recruiterName: a.recruiterName ?? null,
        recruiterEmail: a.recruiterEmail ?? null,
        notes: a.notes ?? null,
        appliedAt: a.appliedAt ?? null,
        createdAt: a.createdAt,
        updatedAt: a.createdAt,
      })
      .returning();
    const appId = appRow!.id;
    appIdsByCompany.set(a.companyName, appId);

    if (a.interviews?.length) {
      await db.insert(interviews).values(
        a.interviews.map((i) => ({
          applicationId: appId,
          type: i.type,
          scheduledAt: i.scheduledAt,
          durationMinutes: i.durationMinutes ?? null,
          notes: i.notes ?? null,
          interviewerName: i.interviewerName ?? null,
          interviewerRole: i.interviewerRole ?? null,
          completed: i.completed ?? false,
          outcome: i.outcome ?? 'pending',
        })),
      );
    }

    if (a.contacts?.length) {
      await db.insert(contacts).values(
        a.contacts.map((c) => ({
          applicationId: appId,
          name: c.name,
          role: c.role ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
          notes: c.notes ?? null,
        })),
      );
    }

    if (a.followUps?.length) {
      await db.insert(followUps).values(
        a.followUps.map((f) => ({
          applicationId: appId,
          dueDate: f.dueDate,
          description: f.description,
          completed: f.completed ?? false,
        })),
      );
    }

    // Always log a creation activity, plus any scripted ones.
    await db.insert(activities).values([
      {
        applicationId: appId,
        type: 'note' as const,
        description: `Created application: ${a.positionTitle} at ${a.companyName}`,
        createdAt: a.createdAt,
      },
      ...(a.activities ?? []).map((act) => ({
        applicationId: appId,
        type: act.type,
        description: act.description,
        createdAt: act.createdAt,
      })),
    ]);
  }

  // A couple of generated cover letters, one linked to an application.
  await db.insert(coverLetters).values([
    {
      userId,
      applicationId: appIdsByCompany.get('Northwind Labs') ?? null,
      jobTitle: 'Full-Stack Engineer',
      jobCompany: 'Northwind Labs',
      jobUrl: 'https://example.com/jobs/northwind-fullstack',
      jobText:
        'Northwind Labs is hiring a Full-Stack Engineer to work on our React + Fastify product. You will own features end to end and care about reliability and developer experience.',
      content: [
        'Dear Northwind Labs Team,',
        '',
        'I was excited to see your Full-Stack Engineer opening. Building product end to end with React and a Fastify backend is exactly the kind of work I do best, and your emphasis on reliability and developer experience resonates with how I approach engineering.',
        '',
        'Recently I shipped services handling significant traffic with a focus on clean APIs and observability, and I enjoy moving fluidly between backend and frontend to deliver complete features. I would bring that same ownership to your team.',
        '',
        'I would love to talk about how I can contribute. Thank you for your consideration.',
        '',
        'Warm regards,',
        'Alex Mara',
      ].join('\n'),
      model: 'seed',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      userId,
      applicationId: appIdsByCompany.get('Orbit Finance') ?? null,
      jobTitle: 'Senior Software Engineer',
      jobCompany: 'Orbit Finance',
      jobUrl: null,
      jobText:
        'Orbit Finance seeks a Senior Software Engineer for our payments platform. Experience with high-reliability backend systems and financial data is a plus.',
      content: [
        'Dear Orbit Finance Hiring Team,',
        '',
        'The Senior Software Engineer role on your payments platform immediately caught my attention. I have spent the last few years building high-reliability backend systems, including a payments service redesign that cut p99 latency by 40%.',
        '',
        'I care deeply about correctness, observability, and the kind of pragmatic trade-offs that financial systems demand. I would be thrilled to bring that experience to Orbit.',
        '',
        'Thank you for your time — I look forward to the conversation.',
        '',
        'Best regards,',
        'Alex Mara',
      ].join('\n'),
      model: 'seed',
      createdAt: daysAgo(20),
      updatedAt: daysAgo(18),
    },
  ]);

  console.log('Seed complete.');
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  ${DEMO_APPLICATIONS.length} applications, ${references.length} reference(s), 2 cover letters.`);
}

seed()
  .then(() => closeDb())
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await closeDb();
    process.exit(1);
  });
