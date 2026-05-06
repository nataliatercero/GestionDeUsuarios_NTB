import { Readable } from 'stream';
import sharp from 'sharp';
import cloudinary from '../config/cloudinary.js';

const DEFAULT_MAX_WIDTH = 800;

const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

export const uploadToCloudinary = async (fileBuffer, options = {}) => {
  const {
    folder = 'bildy',
    resourceType = 'image',
    maxWidth = DEFAULT_MAX_WIDTH,
    publicId,
  } = options;

  let bufferToUpload = fileBuffer;

  if (resourceType === 'image') {
    bufferToUpload = await sharp(fileBuffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType
    };
    if (publicId) uploadOptions.public_id = publicId;

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });

    bufferToStream(bufferToUpload).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};
