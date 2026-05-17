const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { dishImageStorage } = require('../config/storage');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const TYPE_CONFIG = {
  'image/jpeg': { ext: 'jpg', extensions: ['.jpg', '.jpeg'] },
  'image/png': { ext: 'png', extensions: ['.png'] },
  'image/webp': { ext: 'webp', extensions: ['.webp'] },
};

function createValidationError(message) {
  return new ValidationError('Du lieu khong hop le', [
    { field: 'body.image', message },
  ]);
}

function formatMaxSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  }
  return `${bytes} bytes`;
}

function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function validateFile(file) {
  if (!file || !file.buffer) {
    throw createValidationError('Dish image file is required');
  }

  if (file.size <= 0) {
    throw createValidationError('Dish image file is required');
  }

  if (file.size > dishImageStorage.maxBytes) {
    throw createValidationError(`Dish image must be ${formatMaxSize(dishImageStorage.maxBytes)} or smaller`);
  }

  const detectedMime = detectImageMime(file.buffer);
  const reportedMime = file.mimetype;
  const type = TYPE_CONFIG[detectedMime];

  if (!type || !TYPE_CONFIG[reportedMime]) {
    throw createValidationError('Only JPEG, PNG, and WebP dish images are allowed');
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension && !type.extensions.includes(extension)) {
    throw createValidationError('Only JPEG, PNG, and WebP dish images are allowed');
  }

  return { mimeType: detectedMime, extension: type.ext };
}

function buildPublicUrl(objectKey) {
  return `${dishImageStorage.publicBaseUrl}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
}

async function storeDishImage(file, context = {}) {
  const validated = validateFile(file);
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const objectKey = `menu-items/${year}/${month}/${crypto.randomUUID()}.${validated.extension}`;
  const targetPath = path.join(dishImageStorage.directory, objectKey);

  try {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.buffer, { flag: 'wx' });

    logger.info('Dish image uploaded', {
      requestId: context.requestId,
      userId: context.userId,
      role: context.role,
      objectKey,
      sizeBytes: file.size,
      mimeType: validated.mimeType,
    });

    return {
      url: buildPublicUrl(objectKey),
      object_key: objectKey,
      mime_type: validated.mimeType,
      size_bytes: file.size,
    };
  } catch (error) {
    logger.error('Dish image storage failed', {
      requestId: context.requestId,
      userId: context.userId,
      role: context.role,
      objectKey,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  storeDishImage,
  detectImageMime,
};
