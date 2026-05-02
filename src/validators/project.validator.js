import { z } from 'zod';

// Esquema para validar que el string sea un ID de MongoDB (24 caracteres hexadecimales)
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID inválido');

// Esquema opcional para la ubicación física del proyecto
const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  postal: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional()
}).optional();

// Definición de los campos permitidos para un proyecto
const projectBodySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
  
  // Código interno único por empresa
  projectCode: z.string().min(1, 'El código de proyecto es requerido').trim(),
  
  // ID del cliente al que pertenece el proyecto
  client: objectIdSchema,
  
  address: addressSchema,
  
  email: z.string().email('Email inválido').optional(),
  
  notes: z.string().optional(),
  
  // Estado del proyecto (activo por defecto)
  active: z.boolean().optional()
});

// Esquema para la creación (todos los campos obligatorios según base)
export const createProjectSchema = z.object({
  body: projectBodySchema
});

// Esquema para actualización (permite modificar campos sueltos)
export const updateProjectSchema = z.object({
  body: projectBodySchema.partial()
});