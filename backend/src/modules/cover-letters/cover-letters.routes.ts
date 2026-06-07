import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { db } from '../../db/client.js';
import { authenticate } from '../../middleware/auth-guard.js';
import { ApplicationsRepository } from '../applications/applications.repository.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { ProfileRepository } from '../profile/profile.repository.js';
import { ProfileService } from '../profile/profile.service.js';
import { CoverLettersController } from './cover-letters.controller.js';
import { CoverLettersRepository } from './cover-letters.repository.js';
import { CoverLettersService } from './cover-letters.service.js';
import {
  coverLetterListSchema,
  coverLetterSchema,
  createReferenceSchema,
  generateCoverLetterSchema,
  idParamSchema,
  listCoverLettersQuerySchema,
  referenceListSchema,
  referenceSchema,
  saveCoverLetterSchema,
  updateCoverLetterSchema,
  updateReferenceSchema,
} from './cover-letters.schemas.js';

export const coverLettersRoutes: FastifyPluginAsyncZod = async (router) => {
  const service = new CoverLettersService(
    new CoverLettersRepository(db),
    new ProfileService(new ProfileRepository(db)),
    new ApplicationsService(new ApplicationsRepository(db)),
  );
  const controller = new CoverLettersController(service);

  router.addHook('preHandler', authenticate);

  // --- References (static paths registered before parametric letter routes) ---
  router.get(
    '/cover-letters/references',
    { schema: { response: { 200: referenceListSchema } } },
    controller.listReferences,
  );

  router.post(
    '/cover-letters/references',
    {
      schema: {
        body: createReferenceSchema,
        response: { 201: referenceSchema },
      },
    },
    controller.createReference,
  );

  router.patch(
    '/cover-letters/references/:id',
    {
      schema: {
        params: idParamSchema,
        body: updateReferenceSchema,
        response: { 200: referenceSchema },
      },
    },
    controller.updateReference,
  );

  router.delete(
    '/cover-letters/references/:id',
    { schema: { params: idParamSchema } },
    controller.removeReference,
  );

  // --- Cover letters ---
  router.post(
    '/cover-letters/generate',
    {
      schema: {
        body: generateCoverLetterSchema,
        response: { 201: coverLetterSchema },
      },
    },
    controller.generate,
  );

  router.post(
    '/cover-letters',
    {
      schema: {
        body: saveCoverLetterSchema,
        response: { 201: coverLetterSchema },
      },
    },
    controller.save,
  );

  router.get(
    '/cover-letters',
    {
      schema: {
        querystring: listCoverLettersQuerySchema,
        response: { 200: coverLetterListSchema },
      },
    },
    controller.list,
  );

  router.get(
    '/cover-letters/:id',
    {
      schema: {
        params: idParamSchema,
        response: { 200: coverLetterSchema },
      },
    },
    controller.getById,
  );

  router.patch(
    '/cover-letters/:id',
    {
      schema: {
        params: idParamSchema,
        body: updateCoverLetterSchema,
        response: { 200: coverLetterSchema },
      },
    },
    controller.update,
  );

  router.delete(
    '/cover-letters/:id',
    { schema: { params: idParamSchema } },
    controller.remove,
  );
};
