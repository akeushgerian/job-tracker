import type { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { EmailSyncRepository } from './email-sync.repository.js';
import { EmailSyncService } from './email-sync.service.js';
import { EmailTriageService } from './email-triage.js';
import { GmailFetcher } from './gmail.fetcher.js';

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

export function startPoller(app: FastifyInstance): void {
  const intervalMs = process.env.EMAIL_SYNC_INTERVAL_MS
    ? parseInt(process.env.EMAIL_SYNC_INTERVAL_MS, 10)
    : DEFAULT_INTERVAL_MS;

  const repo = new EmailSyncRepository(db);
  const service = new EmailSyncService(repo);
  const triage = new EmailTriageService(service);
  const fetcher = new GmailFetcher(service);

  async function runCycle() {
    let connections: Awaited<ReturnType<typeof service.getAllActiveConnections>>;
    try {
      connections = await service.getAllActiveConnections();
    } catch (err) {
      app.log.error({ err }, '[email-sync] Failed to load active connections');
      return;
    }

    for (const connection of connections) {
      try {
        const result = await fetcher.syncUser(connection.userId, triage);
        if (result.matched > 0) {
          app.log.info({ userId: connection.userId, matched: result.matched }, '[email-sync] Synced');
        }
      } catch (err) {
        app.log.error({ err, userId: connection.userId }, '[email-sync] Per-user sync failed');
      }
    }
  }

  setInterval(() => { runCycle().catch(() => {}); }, intervalMs);
  app.log.info({ intervalMs }, '[email-sync] Poller started');
}
