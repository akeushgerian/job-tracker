import type { gmail_v1 } from 'googleapis';
import { buildGmailClient, isInvalidGrantError } from './gmail.client.js';
import type { EmailSyncService } from './email-sync.service.js';
import type { EmailTriageService } from './email-triage.js';
import type { SyncActionDto, SyncResultDto } from './email-sync.schemas.js';

const FIRST_SYNC_MAX = 500;
const FIRST_SYNC_DAYS = 30;

export interface RawEmail {
  messageId: string;
  subject: string;
  sender: string;
  snippet: string;
  body: string;
  receivedAt: Date;
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function extractTextBody(part: gmail_v1.Schema$MessagePart | undefined, depth = 0): string {
  if (!part || depth > 5) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return Buffer.from(part.body.data, 'base64url').toString('utf-8');
  }
  for (const child of part.parts ?? []) {
    const text = extractTextBody(child, depth + 1);
    if (text) return text;
  }
  return '';
}

async function fetchMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<RawEmail | null> {
  try {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    const headers = msg.data.payload?.headers ?? [];
    const subject = getHeader(headers, 'Subject') || '(no subject)';
    const sender = getHeader(headers, 'From') || '';
    const internalDate = msg.data.internalDate;
    const receivedAt = internalDate ? new Date(parseInt(internalDate, 10)) : new Date();
    const snippet = msg.data.snippet ?? '';
    const body = extractTextBody(msg.data.payload ?? undefined).slice(0, 2000);
    return { messageId, subject, sender, snippet, body, receivedAt };
  } catch {
    return null;
  }
}

export class GmailFetcher {
  constructor(private readonly service: EmailSyncService) {}

  async syncUser(userId: string, triage: EmailTriageService, rescanDays?: number): Promise<SyncResultDto> {
    const connection = await this.service.getConnection(userId);
    if (!connection || connection.status !== 'active') {
      console.log('[email-sync] No active connection for user, skipping');
      return { processed: 0, matched: 0, actions: [] };
    }

    const gmail = buildGmailClient(connection);
    const syncState = await this.service.getSync(userId);

    let messages: RawEmail[] = [];
    let newHistoryId: string | null = null;

    try {
      if (rescanDays) {
        console.log(`[email-sync] Rescan — fetching last ${rescanDays} days`);
        messages = await this.firstSync(gmail, rescanDays);
        const profile = await gmail.users.getProfile({ userId: 'me' });
        newHistoryId = profile.data.historyId ?? null;
        console.log(`[email-sync] Rescan fetched ${messages.length} messages`);
      } else if (!syncState?.historyId) {
        console.log('[email-sync] First sync — fetching last 30 days');
        messages = await this.firstSync(gmail, FIRST_SYNC_DAYS);
        const profile = await gmail.users.getProfile({ userId: 'me' });
        newHistoryId = profile.data.historyId ?? null;
        console.log(`[email-sync] First sync fetched ${messages.length} messages, historyId=${newHistoryId}`);
      } else {
        console.log(`[email-sync] Incremental sync from historyId=${syncState.historyId}`);
        const result = await this.incrementalSync(gmail, syncState.historyId);
        messages = result.messages;
        newHistoryId = result.newHistoryId;
        console.log(`[email-sync] Incremental sync found ${messages.length} new messages`);
      }
    } catch (err) {
      if (isInvalidGrantError(err)) {
        await this.service.markNeedsReauth(userId);
      }
      throw err;
    }

    await this.service.upsertSync(userId, newHistoryId);

    const actions: SyncActionDto[] = [];
    let matched = 0;
    for (const email of messages) {
      const existingStatus = await this.service.getMatchStatus(userId, email.messageId);

      if (existingStatus !== null) {
        // On rescan: re-process emails that were previously ignored (they may have been
        // skipped due to LLM errors or a missing keyword list). Skip already-classified ones.
        if (existingStatus !== 'ignored' || !rescanDays) {
          console.log(`[email-sync] Skipping duplicate: ${email.subject}`);
          continue;
        }
        await this.service.deleteIgnoredMatch(userId, email.messageId);
        console.log(`[email-sync] Re-triaging previously ignored: "${email.subject}"`);
      }

      const action = await triage.triageEmail(userId, email);
      if (action) {
        matched++;
        actions.push(action);
        console.log(`[email-sync]   → action=${action.action} confidence=${action.confidence.toFixed(2)} status=${action.status} company=${action.company ?? 'unknown'}`);
      } else {
        console.log(`[email-sync]   → ignored (not job-related)`);
      }
    }

    console.log(`[email-sync] Sync complete. matched=${matched}/${messages.length}`);
    return { processed: messages.length, matched, actions };
  }

  private async firstSync(gmail: gmail_v1.Gmail, days: number): Promise<RawEmail[]> {
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - days);
    const after = Math.floor(afterDate.getTime() / 1000);

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${after}`,
      maxResults: FIRST_SYNC_MAX,
    });

    const messageIds = listRes.data.messages?.map((m) => m.id!).filter(Boolean) ?? [];
    const results = await Promise.all(messageIds.map((id) => fetchMessage(gmail, id)));
    return results.filter((r): r is RawEmail => r !== null);
  }

  private async incrementalSync(
    gmail: gmail_v1.Gmail,
    historyId: string,
  ): Promise<{ messages: RawEmail[]; newHistoryId: string | null }> {
    const historyRes = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded'],
    });

    const newHistoryId = historyRes.data.historyId ?? null;
    const addedIds = new Set<string>();
    for (const record of historyRes.data.history ?? []) {
      for (const added of record.messagesAdded ?? []) {
        if (added.message?.id) addedIds.add(added.message.id);
      }
    }

    const results = await Promise.all([...addedIds].map((id) => fetchMessage(gmail, id)));
    return {
      messages: results.filter((r): r is RawEmail => r !== null),
      newHistoryId,
    };
  }
}
