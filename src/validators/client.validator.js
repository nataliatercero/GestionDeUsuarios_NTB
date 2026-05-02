import { z } from 'zod';

// Esquema reutilizable para direcciones físicas
const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  postal: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional()
}).optional();

// Definición de los campos del cuerpo del cliente
const clientBodySchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .trim(),
  
  // El CIF debe ser exacto y se normaliza a mayúsculas automáticamente
  cif: z.string()
    .length(9, 'El CIF debe tener exactamente 9 caracteres')
    .trim()
    .transform((val) => val.toUpperCase()),
  
  // Validación de email con normalización a minúsculas
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

// Esquema para la creación de un nuevo cliente (todos los campos requeridos según base)
export const createClientSchema = z.object({
  body: clientBodySchema
});

// Esquema para actualización (permite enviar solo los campos que se deseen cambiar)
export const updateClientSchema = z.object({
  body: clientBodySchema.partial()
});