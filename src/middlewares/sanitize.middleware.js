// Middleware de sanitización recursiva para prevenir inyecciones NoSQL
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    const sanitize = (obj) => {
      for (const key in obj) {
        // Eliminar claves que empiezan con $ (operadores MongoDB)
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

// Middleware para prevenir ataques DoS truncando strings excesivamente largos
export const limitStringLength = (maxLength = 10000) => (req, res, next) => {
  const truncate = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key].length > maxLength) {
        obj[key] = obj[key].substring(0, maxLength);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        truncate(obj[key]);
      }
    }
  };
  
  if (req.body) truncate(req.body);
  next();
};

// Filtra el body para permitir solo campos específicos
export const allowedFields = (...fields) => (req, res, next) => {
  if (req.body) {
    const filtered = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        filtered[field] = req.body[field];
      }
    }
    req.body = filtered;
  }
  next();
};