import { z } from 'zod';

// Esquema base con campos comunes
const userBaseSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre es demasiado largo')
    .trim(),
  
  email: z.string()
    .email('Formato de email inválido')
    .trim()
    .transform((val) => val.toLowerCase()), // Normalización
});

// Esquema específico para registro (Email + Password)
export const registerUserSchema = z.object({
  body: z.object({
    email: userBaseSchema.shape.email,
    password: z.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número')
  })
});

// Esquema específico para login (sin más validaciones en password, solo que no esté vacío)
export const loginUserSchema = z.object({
  body: z.object({
    email: userBaseSchema.shape.email,
    password: z.string().min(1, 'La contraseña es requerida')
  })
});

// Esquema específico para onboarding (Datos personales: Nombre, NIF y Teléfono)
export const updateProfileSchema = z.object({
  body: z.object({
    name: userBaseSchema.shape.name,
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').trim(),
    nif: z.string()
      .length(9, 'El NIF/CIF debe tener exactamente 9 caracteres')
      .trim()
      .transform((val) => val.toUpperCase()), // Normalización a mayúsculas
    phone: z.string().min(9, 'El teléfono debe tener al menos 9 dígitos').optional()
  })
});