import { google } from 'googleapis';
import { decrypt } from '../../lib/token-crypto.js';
import type { GmailConnectionRow } from '../../db/schema.js';

export function buildGmailClient(connection: GmailConnectionRow) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2.setCredentials({
    access_token: decrypt(connection.encryptedAccessToken),
    refresh_token: decrypt(connection.encryptedRefreshToken),
    expiry_date: connection.tokenExpiryDate?.getTime() ?? undefined,
  });

  return google.gmail({ version: 'v1', auth: oauth2 });
}

export function isInvalidGrantError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message).includes('invalid_grant');
  }
  return false;
}
