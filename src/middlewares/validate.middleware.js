import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    // Validamos y guardamos el resultado "limpio"
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    // Sobreescribimos con los datos ya validados (Zod elimina campos extra)
    if (validated.body) req.body = validated.body;
    if (validated.params) req.params = validated.params;
    // req.query = validated.query ?? req.query; (ahora req.query es solo de lectura, rompe cosas si lo intentas setear)
    next(); // Si todo es correcto, pasamos al siguiente middleware
  } catch (error) {
        // Zod mete los errores en .errors, si no existe es otro tipo de error
        // Si es un error de Zod, lo formateamos nosotros
            if (error instanceof ZodError) {
                const details = error.errors.map(e => ({
                field: e.path.join('.'), // Convierte ['body', 'email'] en "body.email"
                message: e.message
            }));
            return next(AppError.validation('Error de validación en los datos', details));
        }
        next(error); // Error inesperado, lo dejamos subir al error-handler
        }
};