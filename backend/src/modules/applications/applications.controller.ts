import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUser } from '../../middleware/auth-guard.js';
import { ApplicationsService } from './applications.service.js';
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationInput,
} from './applications.schemas.js';
import type { ApplicationStatus } from './applications.schemas.js';

type Params = { id: string };

export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  create = async (
    request: FastifyRequest<{ Body: CreateApplicationInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const created = await this.service.create(user.id, request.body);
    await reply.status(201).send(created);
  };

  list = async (
    request: FastifyRequest<{ Querystring: ListApplicationsQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const result = await this.service.list(user.id, request.query);
    await reply.status(200).send(result);
  };

  getById = async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const application = await this.service.getById(user.id, request.params.id);
    await reply.status(200).send(application);
  };

  update = async (
    request: FastifyRequest<{ Params: Params; Body: UpdateApplicationInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const updated = await this.service.update(user.id, request.params.id, request.body);
    await reply.status(200).send(updated);
  };

  changeStatus = async (
    request: FastifyRequest<{ Params: Params; Body: { status: ApplicationStatus } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const updated = await this.service.changeStatus(
      user.id,
      request.params.id,
      request.body.status,
    );
    await reply.status(200).send(updated);
  };

  remove = async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    await this.service.remove(user.id, request.params.id);
    await reply.status(204).send();
  };
}
