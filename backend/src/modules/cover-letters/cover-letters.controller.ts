import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireUser } from '../../middleware/auth-guard.js';
import { CoverLettersService } from './cover-letters.service.js';
import type {
  CreateReferenceInput,
  GenerateCoverLetterInput,
  ListCoverLettersQuery,
  SaveCoverLetterInput,
  UpdateCoverLetterInput,
  UpdateReferenceInput,
} from './cover-letters.schemas.js';

type Params = { id: string };

export class CoverLettersController {
  constructor(private readonly service: CoverLettersService) {}

  generate = async (
    request: FastifyRequest<{ Body: GenerateCoverLetterInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const letter = await this.service.generate(user.id, request.body);
    await reply.status(201).send(letter);
  };

  save = async (
    request: FastifyRequest<{ Body: SaveCoverLetterInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const letter = await this.service.save(user.id, request.body);
    await reply.status(201).send(letter);
  };

  list = async (
    request: FastifyRequest<{ Querystring: ListCoverLettersQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const letters = await this.service.list(user.id, request.query.applicationId);
    await reply.status(200).send(letters);
  };

  getById = async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const letter = await this.service.getById(user.id, request.params.id);
    await reply.status(200).send(letter);
  };

  update = async (
    request: FastifyRequest<{ Params: Params; Body: UpdateCoverLetterInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const letter = await this.service.updateContent(
      user.id,
      request.params.id,
      request.body.content,
    );
    await reply.status(200).send(letter);
  };

  remove = async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    await this.service.remove(user.id, request.params.id);
    await reply.status(204).send();
  };

  listReferences = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const references = await this.service.listReferences(user.id);
    await reply.status(200).send(references);
  };

  createReference = async (
    request: FastifyRequest<{ Body: CreateReferenceInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const reference = await this.service.createReference(user.id, request.body);
    await reply.status(201).send(reference);
  };

  updateReference = async (
    request: FastifyRequest<{ Params: Params; Body: UpdateReferenceInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    const reference = await this.service.updateReference(
      user.id,
      request.params.id,
      request.body,
    );
    await reply.status(200).send(reference);
  };

  removeReference = async (
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = requireUser(request);
    await this.service.removeReference(user.id, request.params.id);
    await reply.status(204).send();
  };
}
