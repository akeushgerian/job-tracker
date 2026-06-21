import { google } from 'googleapis';
import { encrypt } from '../../lib/token-crypto.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { EmailSyncRepository } from './email-sync.repository.js';
import type { GmailStatusDto, EmailMatchDto } from './email-sync.schemas.js';
import type { EmailMatchRow, GmailConnectionRow } from '../../db/schema.js';

export class GmailNotConnectedError extends AppError {
  readonly statusCode = 404;
  readonly code = 'GMAIL_NOT_CONNECTED';
  constructor() { super('No Gmail account connected'); }
}

export class GmailOAuthError extends AppError {
  readonly statusCode = 400;
  readonly code = 'GMAIL_OAUTH_ERROR';
}

// gmail.readonly is a superset of gmail.metadata and allows the 'q' search parameter.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// In-memory CSRF state store: state token → userId
const pendingStates = new Map<string, string>();

function buildOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function toDto(row: EmailMatchRow): EmailMatchDto {
  return {
    id: row.id,
    userId: row.userId,
    gmailMessageId: row.gmailMessageId,
    applicationId: row.applicationId ?? null,
    subject: row.subject,
    sender: row.sender,
    snippet: row.snippet,
    receivedAt: row.receivedAt.toISOString(),
    action: row.action,
    confidence: row.confidence,
    status: row.status,
    classificationError: row.classificationError ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class EmailSyncService {
  constructor(private readonly repo: EmailSyncRepository) {}

  getOAuthUrl(userId: string): string {
    const oauth2 = buildOAuth2Client();
    const state = crypto.randomUUID();
    pendingStates.set(state, userId);
    // Clean up state tokens older than 10 minutes
    setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state,
    });
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const userId = pendingStates.get(state);
    if (!userId) throw new GmailOAuthError('Invalid or expired OAuth state');
    pendingStates.delete(state);

    const oauth2 = buildOAuth2Client();
    let tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null };
    try {
      const { tokens: t } = await oauth2.getToken(code);
      tokens = t;
    } catch {
      throw new GmailOAuthError('Failed to exchange OAuth code for tokens');
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new GmailOAuthError('Google did not return required tokens — ensure offline access was granted');
    }

    oauth2.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const connectedEmail = profile.data.emailAddress ?? '';

    await this.repo.upsertConnection(userId, {
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      tokenExpiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      connectedEmail,
    });
  }

  async getStatus(userId: string): Promise<GmailStatusDto> {
    const connection = await this.repo.findConnection(userId);
    if (!connection) {
      return { connected: false, connectedEmail: null, lastSyncedAt: null, needsReauth: false };
    }
    const syncState = await this.repo.findSync(userId);
    return {
      connected: true,
      connectedEmail: connection.connectedEmail,
      lastSyncedAt: syncState?.lastSyncedAt?.toISOString() ?? null,
      needsReauth: connection.status === 'needs_reauth',
    };
  }

  async disconnect(userId: string): Promise<void> {
    await this.repo.deleteConnection(userId);
    await this.repo.deleteSync(userId);
  }

  async listMatches(userId: string, applicationId?: string): Promise<EmailMatchDto[]> {
    const rows = await this.repo.listMatches(userId, applicationId);
    return rows.map(toDto);
  }

  async confirmMatch(
    id: string,
    userId: string,
    applyAction: (match: EmailMatchRow) => Promise<void>,
  ): Promise<EmailMatchDto> {
    const match = await this.repo.findMatchById(id, userId);
    if (!match) throw new NotFoundError(`Email match "${id}" not found`);
    await applyAction(match);
    const updated = await this.repo.updateMatchStatus(id, 'applied');
    return toDto(updated);
  }

  async dismissMatch(id: string, userId: string): Promise<EmailMatchDto> {
    const match = await this.repo.findMatchById(id, userId);
    if (!match) throw new NotFoundError(`Email match "${id}" not found`);
    const updated = await this.repo.updateMatchStatus(id, 'ignored');
    return toDto(updated);
  }

  getConnection(userId: string): Promise<GmailConnectionRow | undefined> {
    return this.repo.findConnection(userId);
  }

  getAllActiveConnections(): Promise<GmailConnectionRow[]> {
    return this.repo.findAllActiveConnections();
  }

  markNeedsReauth(userId: string): Promise<void> {
    return this.repo.markConnectionNeedsReauth(userId);
  }

  getSync(userId: string) {
    return this.repo.findSync(userId);
  }

  upsertSync(userId: string, historyId: string | null) {
    return this.repo.upsertSync(userId, historyId);
  }

  getMatchStatus(userId: string, gmailMessageId: string) {
    return this.repo.getMatchStatus(userId, gmailMessageId);
  }

  deleteIgnoredMatch(userId: string, gmailMessageId: string) {
    return this.repo.deleteIgnoredMatch(userId, gmailMessageId);
  }

  createMatch(data: Parameters<EmailSyncRepository['createMatch']>[0]) {
    return this.repo.createMatch(data);
  }
}
