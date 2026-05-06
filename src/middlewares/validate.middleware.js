import { AppError } from '../utils/AppError.js';
import { ZodError } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    if (validated.body) req.body = validated.body;
    if (validated.params) req.params = validated.params;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return next(AppError.validation('Error de validación en los datos', details));
    }
    next(error);
  }
};
