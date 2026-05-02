import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('El archivo debe ser una imagen (jpeg, png, etc.)', 400), false);
  }
};

const multerInstance = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const upload = multerInstance.single('logo');
export const uploadField = (fieldName) => multerInstance.single(fieldName);
