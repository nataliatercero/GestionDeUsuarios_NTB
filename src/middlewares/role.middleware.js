import { AppError } from '../utils/AppError.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Usuario no identificado'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('No tienes permisos suficientes para esta acción'));
    }

    next();
  };
};
