import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError, ValidationError } from '../lib/errors.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Zod request-validation failures from fastify-type-provider-zod.
  if (hasZodFastifySchemaValidationErrors(error)) {
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
    } satisfies ErrorBody);
    return;
  }

  if (error instanceof AppError) {
    const body: ErrorBody = {
      error: { code: error.code, message: error.message },
    };
    if (error instanceof ValidationError && error.details !== undefined) {
      body.error.details = error.details;
    }
    reply.status(error.statusCode).send(body);
    return;
  }

  // Fastify's own errors (e.g. 404, payload too large) carry a statusCode.
  if (typeof error.statusCode === 'number' && error.statusCode < 500) {
    reply.status(error.statusCode).send({
      error: { code: error.code ?? 'REQUEST_ERROR', message: error.message },
    } satisfies ErrorBody);
    return;
  }

  request.log.error({ err: error }, 'Unhandled error');
  reply.status(500).send({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
  } satisfies ErrorBody);
}
