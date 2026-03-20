import { z } from 'zod';

// Esquema base con campos comunes
const userBaseSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre es demasiado largo')
    .trim(),
  
  email: z.string()
    .email('Formato de email inválido')
    .toLowerCase()
    .trim(),
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

// Esquema específico para login (sin validaciones estrictas en password, solo que no esté vacío)
export const loginUserSchema = z.object({
  body: z.object({
    email: userBaseSchema.shape.email,
    password: z.string().min(1, 'La contraseña es requerida')
  })
});