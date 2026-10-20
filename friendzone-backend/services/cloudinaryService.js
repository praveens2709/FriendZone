import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { cloudinary } from '../config/cloudinary.js';

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);
const useLocalStorage = !cloudinaryConfigured && process.env.NODE_ENV !== 'production';

export const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
const LOCAL_PREFIX = 'local:';

if (useLocalStorage) {
  console.warn('Cloudinary is not configured: uploads are stored on this server (development only).');
}

const publicBaseUrl = () =>
  (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

const detectExtension = async (buffer) => {
  try {
    const { format } = await sharp(buffer).metadata();
    if (format) return { ext: format === 'jpeg' ? 'jpg' : format, type: 'image' };
  } catch {
  }
  if (buffer.length > 12 && buffer.subarray(4, 8).toString() === 'ftyp') {
    return { ext: 'mp4', type: 'video' };
  }
  return { ext: 'bin', type: 'raw' };
};

const saveLocally = async (fileBuffer, folder) => {
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '');
  const dir = path.join(UPLOADS_DIR, safeFolder);
  await fs.promises.mkdir(dir, { recursive: true });

  const { ext, type } = await detectExtension(fileBuffer);
  const name = `${crypto.randomUUID()}.${ext}`;
  await fs.promises.writeFile(path.join(dir, name), fileBuffer);

  return {
    public_id: `${LOCAL_PREFIX}${safeFolder}/${name}`,
    url: `${publicBaseUrl()}/uploads/${safeFolder}/${name}`,
    resource_type: type,
  };
};

export const uploadImageToCloudinary = async (fileBuffer, folder = 'posts') => {
  if (useLocalStorage) {
    return saveLocally(fileBuffer, folder);
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          public_id: result.public_id,
          url: result.secure_url,
          resource_type: result.resource_type,
        });
      }
    ).end(fileBuffer);
  });
};

export const deleteImageFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;

  if (publicId.startsWith(LOCAL_PREFIX)) {
    const relative = publicId.slice(LOCAL_PREFIX.length);
    const target = path.join(UPLOADS_DIR, relative);
    if (target.startsWith(UPLOADS_DIR + path.sep)) {
      await fs.promises.unlink(target).catch(() => null);
    }
    return null;
  }

  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete failed:', error.message);
    return null;
  }
};
