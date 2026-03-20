import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    // Validamos y guardamos el resultado "limpio"
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    // Sobreescribimos con los datos ya validados (Zod elimina campos extra)
    // ?? es para mantener los datos originales si el esquema de Zod no define esa propiedad
    req.body = validated.body ?? req.body;
    req.params = validated.params ?? req.params;
    // req.query = validated.query ?? req.query; (ahora req.query es solo de lectura, rompe cosas si lo intentas setear)
    next(); // Si todo es correcto, pasamos al siguiente middleware
  } catch (error) {
        // Zod mete los errores en .errors, si no existe es otro tipo de error
        if (error.errors) {
            const details = error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }));
            return next(AppError.validation('Error de validación en los datos', details));
        }
        next(error); // Error inesperado, lo dejamos subir al error-handler
        }
};