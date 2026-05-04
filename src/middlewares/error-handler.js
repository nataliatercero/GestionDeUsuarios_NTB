import { AppError } from '../utils/AppError.js';
import { notifySlack5xxError } from '../utils/handleLogger.js';

// Ruta no encontrada

export const notFound = (req, res, next) => {
  next(AppError.notFound(`Ruta ${req.method} ${req.originalUrl}`));
};

// Middleware global de errores

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Si el error no está en mi clase AppError, lo convertirlo en uno
  if (!(error instanceof AppError)) {
    error = AppError.internal(err.message || 'Error inesperado');
  }

  if (error.statusCode >= 500) {
    notifySlack5xxError(req, error);
  }

  // Respuesta única y estandarizada
  res.status(error.statusCode).json({
    error: true,
    message: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    // Solo mostramos el detalle del fallo si no estamos en producción (del .env)
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};