import { AppError } from '../utils/AppError.js';

// Ruta no encontrada

export const notFound = (req, res, next) => {
  next(AppError.notFound(`Ruta ${req.method} ${req.originalUrl}`));
};

// Middleware global de errores

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Si el error no está en mi clase AppError, lo convertirlo en uno
  if (!(error instanceof AppError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Error interno del servidor';
    error = new AppError(message, statusCode, 'INTERNAL_ERROR');
  }

  // Respuesta única y estandarizada
  res.status(error.statusCode).json({
    error: true,
    message: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    // Solo mostramos el stack trace si no estamos en producción
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};