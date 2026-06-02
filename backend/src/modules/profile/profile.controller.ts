import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUser } from '../../middleware/auth-guard.js';
import { ProfileService } from './profile.service.js';
import type { SaveProfileInput } from './profile.schemas.js';

export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  get = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = requireUser(request);
    const profile = await this.service.get(user.id);
    await reply.status(200).send(profile);
  };

  save = async (
    request: FastifyRequest<{ Body: SaveProfileInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const profile = await this.service.save(user.id, request.body);
    await reply.status(200).send(profile);
  };
}
