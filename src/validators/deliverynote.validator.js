import { z } from 'zod';

// Esquema para validar que un string sea un ObjectId de MongoDB válido
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido');

// Esquema para el desglose de trabajadores en albaranes de horas
const workerSchema = z.object({
  name: z.string().min(1, 'El nombre del trabajador es requerido'),
  hours: z.number().positive('Las horas deben ser positivas')
});

// Campos comunes que comparten todos los tipos de albaranes
const baseFields = {
  project: objectIdSchema,
  description: z.string().optional(),
  // z.coerce.date() permite convertir automáticamente strings de fecha en objetos Date
  workDate: z.coerce.date().optional()
};

// Validación específica para albaranes de tipo 'material'
const materialBody = z.object({
  ...baseFields,
  format: z.literal('material'),
  material: z.string().min(1, 'El material es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva'),
  unit: z.string().min(1, 'La unidad es requerida')
});

// Validación específica para albaranes de tipo 'hours'
const hoursBody = z.object({
  ...baseFields,
  format: z.literal('hours'),
  hours: z.number().positive('Las horas deben ser positivas').optional(),
  workers: z.array(workerSchema).min(1, 'Debe indicar al menos un trabajador').optional()
});

// Esquema principal: usa discriminatedUnion para validar según el campo 'format'
export const createDeliveryNoteSchema = z.object({
  body: z.discriminatedUnion('format', [materialBody, hoursBody])
});