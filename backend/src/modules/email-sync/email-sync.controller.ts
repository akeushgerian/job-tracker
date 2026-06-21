import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUser } from '../../middleware/auth-guard.js';
import { config } from '../../config/index.js';
import { EmailSyncService } from './email-sync.service.js';
import { EmailTriageService } from './email-triage.js';
import { GmailFetcher } from './gmail.fetcher.js';

export class EmailSyncController {
  constructor(
    private readonly service: EmailSyncService,
    private readonly fetcher: GmailFetcher,
    private readonly triage: EmailTriageService,
  ) {}

  getOAuthUrl = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = requireUser(request);
    const url = this.service.getOAuthUrl(user.id);
    await reply.status(200).send({ url });
  };

  handleCallback = async (
    request: FastifyRequest<{ Querystring: { code: string; state: string; error?: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const { code, state, error } = request.query;
    if (error) {
      return reply.redirect(`${config.FRONTEND_URL}/settings/gmail?error=${encodeURIComponent(error)}`);
    }
    await this.service.handleCallback(code, state);
    return reply.redirect(`${config.FRONTEND_URL}/settings/gmail?connected=true`);
  };

  getStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = requireUser(request);
    const status = await this.service.getStatus(user.id);
    await reply.status(200).send(status);
  };

  disconnect = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = requireUser(request);
    await this.service.disconnect(user.id);
    await reply.status(204).send();
  };

  triggerSync = async (
    request: FastifyRequest<{ Querystring: { days?: number } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const result = await this.fetcher.syncUser(user.id, this.triage, request.query.days);
    await reply.status(200).send(result);
  };

  listMatches = async (
    request: FastifyRequest<{ Querystring: { applicationId?: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const matches = await this.service.listMatches(user.id, request.query.applicationId);
    await reply.status(200).send(matches);
  };

  confirmMatch = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const match = await this.service.confirmMatch(
      request.params.id,
      user.id,
      (m) => this.triage.applyAction(m, user.id),
    );
    await reply.status(200).send(match);
  };

  dismissMatch = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const match = await this.service.dismissMatch(request.params.id, user.id);
    await reply.status(200).send(match);
  };
}
