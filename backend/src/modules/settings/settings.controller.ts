import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUser } from '../../middleware/auth-guard.js';
import { SettingsService } from './settings.service.js';
import type { UpdateAiSettingsInput } from './settings.schemas.js';

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  getAiSettings = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = requireUser(request);
    const settings = await this.service.getAiSettings(user.id);
    await reply.status(200).send(settings);
  };

  updateAiSettings = async (
    request: FastifyRequest<{ Body: UpdateAiSettingsInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const settings = await this.service.updateAiSettings(user.id, request.body);
    await reply.status(200).send(settings);
  };
}
