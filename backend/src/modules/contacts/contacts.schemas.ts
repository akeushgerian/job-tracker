import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
  email: z.email().max(200).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(10000).optional(),
});

export const updateContactSchema = z
  .object({
    name: z.string().min(1).max(200),
    role: z.string().max(200).nullable(),
    email: z.email().max(200).nullable(),
    phone: z.string().max(50).nullable(),
    notes: z.string().max(10000).nullable(),
  })
  .partial();

export const contactSchema = z.object({
  id: z.uuid(),
  applicationId: z.uuid(),
  name: z.string(),
  role: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const contactListSchema = z.array(contactSchema);

export const applicationIdParamSchema = z.object({ applicationId: z.uuid() });
export const idParamSchema = z.object({ id: z.uuid() });

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactDto = z.infer<typeof contactSchema>;
