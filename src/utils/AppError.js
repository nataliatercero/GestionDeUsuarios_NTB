export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }

  // Para cuando una ruta no existe (404)
  static notFound(resource = 'Recurso', code = 'NOT_FOUND') {
    return new AppError(`${resource} no encontrado`, 404, code);
  }

  // Para errores genéricos del servidor o de conexión (500)
  static internal(message = 'Error interno del servidor', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }

  // Para errores de validación (Zod)
  static validation(message = 'Error de validación', details = []) {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    error.details = details; // Aquí guardamos el array de fallos de Zod
    return error;
  }

  // Para conflictos de datos 
  static conflict(message = 'El recurso ya existe', code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  // Para cuando el código de verificación es mal o falta algo
  static badRequest(message = 'Solicitud inválida', code = 'BAD_REQUEST') {
    return new AppError(message, 400, code);
  }

  // Para fallos de login o tokens
  static unauthorized(message = 'No autorizado', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  // Para demasiadas peticiones
  static tooManyRequests(message = 'Demasiadas peticiones', code = 'RATE_LIMIT') {
    return new AppError(message, 429, code);
  }

  // Para cuando el usuario está autenticado pero NO tiene permisos
  static forbidden(message = 'No tienes permisos para realizar esta acción', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }
}

export default AppError;