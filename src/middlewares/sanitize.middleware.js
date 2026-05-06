export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    const sanitize = (obj) => {
      for (const key in obj) {
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
