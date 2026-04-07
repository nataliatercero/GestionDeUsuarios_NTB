import { z } from 'zod';

export const updateCompanySchema = z.object({
  body: z.discriminatedUnion('isFreelance', [
    z.object({ isFreelance: z.literal(true) }),
    z.object({
      isFreelance: z.literal(false),
      name: z.string().min(1, "El nombre de la empresa es obligatorio"),
      cif: z.string().min(9, "El CIF debe tener al menos 9 caracteres").trim().toUpperCase(),
      address: z.object({
        street: z.string().min(1),
        number: z.string().min(1),
        postal: z.string().min(5),
        city: z.string().min(1),
        province: z.string().min(1)
      })
    })
  ])
});