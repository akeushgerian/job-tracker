import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUser } from '../../middleware/auth-guard.js';
import { InterviewsService } from './interviews.service.js';
import type {
  CreateInterviewInput,
  UpdateInterviewInput,
} from './interviews.schemas.js';

export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}

  list = async (
    request: FastifyRequest<{ Params: { applicationId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const items = await this.service.listForApplication(
      user.id,
      request.params.applicationId,
    );
    await reply.status(200).send(items);
  };

  create = async (
    request: FastifyRequest<{
      Params: { applicationId: string };
      Body: CreateInterviewInput;
    }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const created = await this.service.create(
      user.id,
      request.params.applicationId,
      request.body,
    );
    await reply.status(201).send(created);
  };

  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const interview = await this.service.getById(user.id, request.params.id);
    await reply.status(200).send(interview);
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateInterviewInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const updated = await this.service.update(user.id, request.params.id, request.body);
    await reply.status(200).send(updated);
  };

  remove = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    await this.service.remove(user.id, request.params.id);
    await reply.status(204).send();
  };
}
