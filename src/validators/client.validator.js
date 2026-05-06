import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  postal: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional()
}).optional();

const clientBodySchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .trim(),

  cif: z.string()
    .length(9, 'El CIF debe tener exactamente 9 caracteres')
    .trim()
    .transform((val) => val.toUpperCase()),

  email: z.string()
    .email('Formato de email inválido')
    .trim()
    .transform((val) => val.toLowerCase())
    .optional(),

  phone: z.string()
    .min(9, 'El teléfono debe tener al menos 9 dígitos')
    .optional(),

  address: addressSchema
});

export const createClientSchema = z.object({
  body: clientBodySchema
});

export const updateClientSchema = z.object({
  body: clientBodySchema.partial()
});
