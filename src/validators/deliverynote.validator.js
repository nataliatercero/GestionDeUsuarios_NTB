import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido');

const workerSchema = z.object({
  name: z.string().min(1, 'El nombre del trabajador es requerido'),
  hours: z.number().positive('Las horas deben ser positivas')
});

const baseFields = {
  project: objectIdSchema,
  description: z.string().optional(),
  workDate: z.coerce.date().optional()
};

const materialBody = z.object({
  ...baseFields,
  format: z.literal('material'),
  material: z.string().min(1, 'El material es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva'),
  unit: z.string().min(1, 'La unidad es requerida')
});

const hoursBody = z.object({
  ...baseFields,
  format: z.literal('hours'),
  hours: z.number().positive('Las horas deben ser positivas').optional(),
  workers: z.array(workerSchema).min(1, 'Debe indicar al menos un trabajador').optional()
});

export const createDeliveryNoteSchema = z.object({
  body: z.discriminatedUnion('format', [materialBody, hoursBody])
});
