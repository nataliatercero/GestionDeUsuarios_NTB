import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido');

const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  postal: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional()
}).optional();

const projectBodySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),

  projectCode: z.string().min(1, 'El código de proyecto es requerido').trim(),

  client: objectIdSchema,

  address: addressSchema,

  email: z.string().email('Email inválido').optional(),

  notes: z.string().optional(),

  active: z.boolean().optional()
});

export const createProjectSchema = z.object({
  body: projectBodySchema
});

export const updateProjectSchema = z.object({
  body: projectBodySchema.partial()
});
