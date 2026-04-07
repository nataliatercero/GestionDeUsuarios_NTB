import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

export const authMiddleware = async (req, res, next) => {
  try {
    // ¿Viene el header de Authorization?
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
      return next(new AppError('No estás autorizado. Token no encontrado', 401, 'NOT_TOKEN'));
    }

    // Extraer el token
    const token = req.headers.authorization.split(' ').pop();

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS);

    // Buscar al usuario en la BD (usando el id del payload del token)
    const user = await User.findOne({ _id: decoded.id, deleted: { $ne: true } });

    if (!user) {
      return next(new AppError('El usuario ya no existe', 401, 'USER_NOT_FOUND'));
    }

    // INYECTAR EL USUARIO
    // A partir de aquí, cualquier ruta que use este middleware tendrá acceso a req.user
    req.user = user;

    next();
  } catch (error) {
    // Si el token ha expirado o es falso, jwt.verify lanza un error
    return next(new AppError('Token inválido o expirado', 401, 'INVALID_TOKEN'));
  }
};

export const isVerified = (req, res, next) => {
  if (req.user && req.user.status === 'verified') {
    return next();
  }
  next(AppError.unauthorized('Acceso denegado. Email no verificado.', 'EMAIL_NOT_VERIFIED'));
};

export const hasProfile = (req, res, next) => {
  // Verificamos que tenga los campos obligatorios del onboarding de usuario
  if (req.user && req.user.name && req.user.nif) {
    return next();
  }
  
  // Si no los tiene, lanzamos un error
  next(AppError.badRequest('Debes completar tus datos personales (Nombre y NIF) antes de gestionar una empresa.'));
};