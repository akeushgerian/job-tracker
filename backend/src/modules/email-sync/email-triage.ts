import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  activities,
  applications,
  contacts,
  interviews,
} from '../../db/schema.js';
import type { EmailMatchRow } from '../../db/schema.js';
import { chatCompletion, type ChatMessage } from '../assistant/assistant.llm.js';
import type { SettingsService } from '../settings/settings.service.js';
import type { EmailSyncService } from './email-sync.service.js';
import type { SyncActionDto } from './email-sync.schemas.js';
import type { RawEmail } from './gmail.fetcher.js';

const CONFIDENCE_THRESHOLD = 0.85;

interface AppRow { id: string; company: string; role: string; status: string }

interface TriageResult {
  jobRelated: boolean;
  applicationId: string | null;
  confidence: number;
  action: EmailMatchRow['action'];
  newStatus: string | null;
  interviewAt: string | null;
  contactName: string | null;
  contactRole: string | null;
}

// Keywords that suggest a job-related email (English + German).
const JOB_KEYWORDS = [
  'application', 'applied', 'applying', 'applicant',
  'interview', 'position', 'role', 'offer', 'hire', 'hiring',
  'recruiter', 'recruitment', 'candidate', 'resume', 'cv',
  'rejection', 'unfortunately', 'not moving forward', 'next steps',
  'bewerbung', 'bewerber', 'stelle', 'absage', 'vorstellungsgespräch',
  'einladung', 'angebot', 'kandidat', 'neuigkeiten',
];

function looksJobRelated(email: RawEmail): boolean {
  const text = `${email.subject} ${email.snippet} ${email.body}`.toLowerCase();
  return JOB_KEYWORDS.some((kw) => text.includes(kw));
}

// Extract meaningful tokens from a company name (length >= 4, skip generic words).
const STOP_WORDS = new Set(['gmbh', 'mbh', 'inc', 'ltd', 'llc', 'corp', 'ag', 'se', 'the', 'and', 'oder', 'und', 'von', 'der', 'die', 'das']);

function companyTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\w\s.]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

function preMatchCompany(email: RawEmail, appRows: AppRow[]): AppRow | null {
  const haystack = `${email.subject} ${email.sender}`.toLowerCase();
  const senderDomain = extractEmail(email.sender)?.split('@')[1]?.toLowerCase() ?? '';

  let bestMatch: AppRow | null = null;
  let bestScore = 0;

  for (const app of appRows) {
    const tokens = companyTokens(app.company);
    if (tokens.length === 0) continue;

    // Count how many tokens appear in subject/sender
    const hits = tokens.filter((t) => haystack.includes(t));
    // Domain match is a strong signal (e.g. "@steueragenten.de" in the sender)
    const domainHit = senderDomain && companyTokens(app.company).some((t) => senderDomain.includes(t));

    const score = hits.length / tokens.length + (domainHit ? 0.5 : 0);
    if (score > bestScore && (hits.length > 0 || domainHit)) {
      bestScore = score;
      bestMatch = app;
    }
  }

  if (bestMatch && bestScore >= 0.3) {
    console.log(`[email-triage] Pre-match: "${bestMatch.company}" (score=${bestScore.toFixed(2)})`);
    return bestMatch;
  }
  return null;
}

function buildPrompt(
  email: RawEmail,
  appList: AppRow[],
  preMatched: AppRow | null,
) {
  const appsJson = JSON.stringify(appList, null, 2);
  const matchHint = preMatched
    ? `\nHINT: Company name analysis matched this email to application id="${preMatched.id}" company="${preMatched.company}". Use this applicationId if the email content confirms it relates to this company.\n`
    : '';

  const bodySection = email.body
    ? `Body (first 2000 chars):\n${email.body}`
    : `Snippet: ${email.snippet}`;

  return `You are an email classifier for a job-application tracker. Analyze the email below and return ONLY a valid JSON object with no extra text.

EMAIL:
From: ${email.sender}
Subject: ${email.subject}
Received: ${email.receivedAt.toISOString()}
${bodySection}
${matchHint}
TRACKED APPLICATIONS (id, company, role, status):
${appsJson}

Return this exact JSON structure:
{
  "jobRelated": boolean,
  "applicationId": "uuid or null",
  "confidence": number between 0 and 1,
  "action": "status_change" | "interview_invite" | "offer" | "rejection" | "follow_up" | "none",
  "newStatus": "discovered|applied|recruiter_call|technical_interview|final_interview|offer|accepted|rejected|withdrawn or null",
  "interviewAt": "ISO8601 datetime or null",
  "contactName": "string or null",
  "contactRole": "string or null"
}

Rules:
- Set jobRelated=true only if this email is clearly about a job application or recruiting.
- The email may be in any language (German, English, etc.) — classify based on meaning, not language.
- Match applicationId to the most likely tracked application by company name. Set null if unsure.
- confidence must reflect how certain you are about the match and action (0.0 to 1.0).
- action=rejection when email indicates the candidate was not selected (any language).
- action=offer when email indicates a job offer is being made.
- action=interview_invite when scheduling or confirming an interview.
- action=follow_up when the sender requests a response or next step.
- Respond with ONLY the JSON object, no markdown, no explanation.`;
}

async function claudeChatCompletion(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API returned ${response.status}: ${body.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  return data.content?.find((b) => b.type === 'text')?.text ?? '';
}

export class EmailTriageService {
  constructor(
    private readonly service: EmailSyncService,
    private readonly settingsService?: SettingsService,
  ) {}

  async triageEmail(userId: string, email: RawEmail): Promise<SyncActionDto | null> {
    const appRows = await db
      .select({
        id: applications.id,
        company: applications.companyName,
        role: applications.positionTitle,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.userId, userId));

    const preMatched = preMatchCompany(email, appRows);

    // Skip the LLM entirely for emails that have no company pre-match and no job keywords.
    // This avoids hammering Ollama with hundreds of irrelevant calls.
    if (!preMatched && !looksJobRelated(email)) {
      console.log(`[email-triage] Skipping (no signals): "${email.subject}"`);
      return null;
    }

    const aiRow = this.settingsService ? await this.settingsService.getAiSettings(userId) : null;
    const provider = aiRow?.provider ?? 'local';
    const claudeApiKey =
      provider === 'claude' && this.settingsService
        ? await this.settingsService.getDecryptedApiKey(userId)
        : null;
    const claudeModel = aiRow?.claudeModel ?? 'claude-haiku-4-5-20251001';

    const useClause = provider === 'claude' && claudeApiKey;
    console.log(`[email-triage] Using provider: ${useClause ? 'claude' : 'local'} — "${email.subject}" (preMatch=${preMatched?.company ?? 'none'})`);

    let result: TriageResult;
    let classificationError: string | null = null;

    try {
      const prompt = buildPrompt(email, appRows, preMatched ?? null);
      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      const content = useClause
        ? await claudeChatCompletion(messages, claudeApiKey, claudeModel)
        : (await chatCompletion(messages, [])).content;
      console.log(`[email-triage] Raw LLM response: ${content.slice(0, 500)}`);
      const parsed = JSON.parse(content.trim()) as Partial<TriageResult>;
      result = {
        jobRelated: Boolean(parsed.jobRelated),
        applicationId: typeof parsed.applicationId === 'string' ? parsed.applicationId : null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        action: (parsed.action as EmailMatchRow['action']) ?? 'none',
        newStatus: parsed.newStatus ?? null,
        interviewAt: parsed.interviewAt ?? null,
        contactName: parsed.contactName ?? null,
        contactRole: parsed.contactRole ?? null,
      };
      console.log(`[email-triage] Parsed: jobRelated=${result.jobRelated}, action=${result.action}, confidence=${result.confidence}, appId=${result.applicationId}`);
    } catch (err) {
      console.log(`[email-triage] LLM error: ${err instanceof Error ? err.message : String(err)}`);
      result = { jobRelated: false, applicationId: null, confidence: 0, action: 'none', newStatus: null, interviewAt: null, contactName: null, contactRole: null };
      classificationError = err instanceof Error ? err.message : String(err);
    }

    if (!result.jobRelated) {
      await this.service.createMatch({
        userId,
        gmailMessageId: email.messageId,
        applicationId: null,
        subject: email.subject,
        sender: email.sender,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        action: 'none',
        confidence: result.confidence,
        status: 'ignored',
        classificationError,
      });
      return null;
    }

    // Validate that applicationId actually belongs to this user
    const validAppId = result.applicationId && appRows.some((a) => a.id === result.applicationId)
      ? result.applicationId
      : null;

    // Status-mutating actions (rejection, offer, status_change) always require human review —
    // auto-applying them based on LLM output alone is too risky and hard to undo.
    const REQUIRES_REVIEW = new Set<string>(['rejection', 'offer', 'status_change']);
    const isConfident = result.confidence >= CONFIDENCE_THRESHOLD
      && validAppId !== null
      && !REQUIRES_REVIEW.has(result.action);

    const status = classificationError || REQUIRES_REVIEW.has(result.action)
      ? 'pending_review'
      : isConfident
        ? 'applied'
        : 'pending_review';

    const match = await this.service.createMatch({
      userId,
      gmailMessageId: email.messageId,
      applicationId: validAppId,
      subject: email.subject,
      sender: email.sender,
      snippet: email.snippet,
      receivedAt: email.receivedAt,
      action: result.action,
      confidence: result.confidence,
      status,
      classificationError,
    });

    if (isConfident && status === 'applied') {
      await this.applyAction(match, userId, result);
    }

    const matchedApp = validAppId ? appRows.find((a) => a.id === validAppId) : null;
    return {
      subject: email.subject,
      sender: email.sender,
      company: matchedApp?.company ?? null,
      action: result.action,
      confidence: result.confidence,
      status: status as 'applied' | 'pending_review',
    };
  }

  async applyAction(
    match: EmailMatchRow,
    _userId: string,
    result?: Partial<TriageResult>,
  ): Promise<void> {
    const applicationId = match.applicationId;
    if (!applicationId) return;

    const action = match.action;

    if (action === 'rejection') {
      await db
        .update(applications)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(eq(applications.id, applicationId));
    } else if (action === 'offer') {
      await db
        .update(applications)
        .set({ status: 'offer', updatedAt: new Date() })
        .where(eq(applications.id, applicationId));
    } else if (action === 'interview_invite') {
      const interviewAt = result?.interviewAt ? new Date(result.interviewAt) : null;
      await db.insert(interviews).values({
        applicationId,
        type: 'recruiter_call',
        scheduledAt: interviewAt,
        completed: false,
        outcome: 'pending',
      });
    }

    // Upsert contact if name was extracted
    const contactName = result?.contactName;
    if (contactName) {
      const senderEmail = extractEmail(match.sender);
      const existing = await db
        .select()
        .from(contacts)
        .where(eq(contacts.applicationId, applicationId))
        .limit(20);
      const alreadyExists = existing.some(
        (c) => c.email === senderEmail || c.name.toLowerCase() === contactName.toLowerCase(),
      );
      if (!alreadyExists) {
        await db.insert(contacts).values({
          applicationId,
          name: contactName,
          role: result?.contactRole ?? null,
          email: senderEmail ?? null,
        });
      }
    }

    // Always log an activity for the email event
    const actionLabels: Record<EmailMatchRow['action'], string> = {
      rejection: 'Rejection received',
      offer: 'Offer received',
      interview_invite: 'Interview invite received',
      follow_up: 'Follow-up email received',
      status_change: 'Status update received',
      none: 'Email received',
    };

    await db.insert(activities).values({
      applicationId,
      type: 'email_received',
      description: `${actionLabels[action]}: "${match.subject}" from ${match.sender}`,
      source: 'email',
      emailMatchId: match.id,
    });
  }
}

function extractEmail(sender: string): string | null {
  const match = sender.match(/<([^>]+)>/);
  if (match) return match[1] ?? null;
  if (sender.includes('@')) return sender.trim();
  return null;
}
