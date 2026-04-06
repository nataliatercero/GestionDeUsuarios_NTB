import { z } from 'zod';

// Esquema para el Onboarding de Compañía 
export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
      .trim(),
    
    cif: z.string()
      .length(9, 'El CIF debe tener exactamente 9 caracteres')
      .trim()
      .transform((val) => val.toUpperCase()), // Normalización automática a mayúsculas
    
    isFreelance: z.boolean().default(false),

    // Validación del objeto address que definimos en el Modelo
    address: z.object({
      street: z.string().optional(),
      number: z.string().optional(),
      postal: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional()
    }).optional()
  })
});