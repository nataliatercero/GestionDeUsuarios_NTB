import { AppError } from '../utils/AppError.js';
import { notifySlack5xxError } from '../utils/handleLogger.js';

export const notFound = (req, res, next) => {
  next(AppError.notFound(`Ruta ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    error = AppError.internal(err.message || 'Error inesperado');
  }

  if (error.statusCode >= 500) {
    notifySlack5xxError(req, error);
  }

  res.status(error.statusCode).json({
    error: true,
    message: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};
