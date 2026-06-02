import { describe, expect, it } from 'vitest';
import { fetchJobPosting, isBlockedAddress } from './job-fetch.js';
import { JobFetchError } from './errors.js';

describe('isBlockedAddress', () => {
  it('blocks loopback, private, link-local, and CGNAT ranges', () => {
    for (const addr of [
      '127.0.0.1',
      '10.1.2.3',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.1.1',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fe80::1',
      'fd00::1',
      '::ffff:127.0.0.1',
    ]) {
      expect(isBlockedAddress(addr), addr).toBe(true);
    }
  });

  it('allows public addresses', () => {
    for (const addr of ['8.8.8.8', '93.184.216.34', '172.15.0.1', '2606:4700:4700::1111']) {
      expect(isBlockedAddress(addr), addr).toBe(false);
    }
  });
});

describe('fetchJobPosting', () => {
  it('refuses non-http(s) schemes', async () => {
    await expect(fetchJobPosting('ftp://example.com/job')).rejects.toBeInstanceOf(
      JobFetchError,
    );
  });

  it('refuses malformed URLs', async () => {
    await expect(fetchJobPosting('not a url')).rejects.toBeInstanceOf(JobFetchError);
  });

  it('refuses URLs that resolve to a private address', async () => {
    await expect(fetchJobPosting('http://localhost/job')).rejects.toBeInstanceOf(
      JobFetchError,
    );
  });
});
