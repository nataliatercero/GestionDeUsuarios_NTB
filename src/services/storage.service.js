import { Readable } from 'stream';
import sharp from 'sharp';
import cloudinary from '../config/cloudinary.js';

const DEFAULT_MAX_WIDTH = 800;

// Helper para convertir el buffer en un flujo de lectura
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Sube un archivo a Cloudinary con optimización previa si es imagen
export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  const {
    folder = 'bildy',
    resourceType = 'image',
    maxWidth = DEFAULT_MAX_WIDTH,
    publicId,
  } = options;

  let bufferToUpload = fileBuffer;

  // Solo optimizamos con Sharp si es una imagen (para no romper los PDF)
  if (resourceType === 'image') {
    bufferToUpload = await sharp(fileBuffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = { 
      folder, 
      resource_type: resourceType // Esto permite 'image' o 'raw' (para PDF)
    };
    if (publicId) uploadOptions.public_id = publicId;

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });

    bufferToStream(bufferToUpload).pipe(uploadStream);
  });
};

// Elimina un recurso de Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};