import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { JobFetchError } from './errors.js';

const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;
const MAX_TEXT_LENGTH = 20_000;

/**
 * True for addresses that must never be fetched server-side: loopback,
 * private (RFC 1918 / ULA), link-local, and unspecified ranges. Blocking
 * these is the primary SSRF control for user-supplied job URLs.
 */
export function isBlockedAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) {
    const [a, b] = address.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b! >= 16 && b! <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b! >= 64 && b! <= 127) return true; // CGNAT
    return false;
  }
  if (kind === 6) {
    const addr = address.toLowerCase();
    if (addr === '::1' || addr === '::') return true;
    if (addr.startsWith('fe80')) return true; // link-local
    if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // ULA
    if (addr.startsWith('::ffff:')) return isBlockedAddress(addr.slice(7));
    return false;
  }
  return false;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

/**
 * Best-effort fetch of a job posting URL. Validates the scheme, refuses
 * private/loopback hosts, applies a timeout and body cap, and returns the
 * page as plain text. Throws JobFetchError on any failure so callers can
 * fall back to pasted text.
 */
export async function fetchJobPosting(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new JobFetchError('That does not look like a valid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new JobFetchError('Only http(s) URLs can be fetched');
  }

  try {
    const resolved = await lookup(url.hostname, { all: true });
    if (resolved.length === 0 || resolved.some((r) => isBlockedAddress(r.address))) {
      throw new JobFetchError('That URL points to a disallowed address');
    }
  } catch (error) {
    if (error instanceof JobFetchError) throw error;
    throw new JobFetchError('Could not resolve that URL');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
  } catch {
    throw new JobFetchError();
  }

  if (!response.ok) {
    throw new JobFetchError(`The page responded with ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new JobFetchError();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);

  const html = Buffer.concat(chunks).toString('utf8');
  const text = stripHtml(html);
  if (!text) {
    throw new JobFetchError('Could not extract any text from that URL');
  }
  return text;
}
