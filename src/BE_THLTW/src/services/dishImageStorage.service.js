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

function createValidationError(message, field = 'body.image') {
  return new ValidationError('Du lieu khong hop le', [
    { field, message },
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
  const validationField = file?.validationField || 'body.image';

  if (!file || !file.buffer) {
    throw createValidationError('Dish image file is required', validationField);
  }

  if (file.size <= 0) {
    throw createValidationError('Dish image file is required', validationField);
  }

  if (file.size > dishImageStorage.maxBytes) {
    throw createValidationError(`Dish image must be ${formatMaxSize(dishImageStorage.maxBytes)} or smaller`, validationField);
  }

  const detectedMime = detectImageMime(file.buffer);
  const reportedMime = file.mimetype;
  const type = TYPE_CONFIG[detectedMime];

  if (!type || !TYPE_CONFIG[reportedMime] || reportedMime !== detectedMime) {
    throw createValidationError('Only JPEG, PNG, and WebP dish images are allowed', validationField);
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension && !type.extensions.includes(extension)) {
    throw createValidationError('Only JPEG, PNG, and WebP dish images are allowed', validationField);
  }

  return { mimeType: detectedMime, extension: type.ext };
}

function normalizeBase64Payload(value) {
  return String(value || '').replace(/\s+/g, '');
}

function decodeBase64Payload(payload) {
  const normalized = normalizeBase64Payload(payload);
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
    /=[A-Za-z0-9+/]/.test(normalized)
  ) {
    throw createValidationError('Dish image data must be valid Base64', 'body.image_base64');
  }

  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const buffer = Buffer.from(padded, 'base64');
  const expected = normalized.replace(/=+$/, '');
  const actual = buffer.toString('base64').replace(/=+$/, '');

  if (!buffer.length || actual !== expected) {
    throw createValidationError('Dish image data must be valid Base64', 'body.image_base64');
  }

  return { buffer, normalized };
}

function parseBase64ImageInput(input = {}) {
  const rawValue = String(input.image_base64 || '').trim();
  if (!rawValue) {
    throw createValidationError('Dish image data is required', 'body.image_base64');
  }

  const dataUrlMatch = rawValue.match(/^data:([^;,]+);base64,(.*)$/is);
  const isDataUrl = rawValue.toLowerCase().startsWith('data:');

  if (isDataUrl && !dataUrlMatch) {
    throw createValidationError('Dish image data must be valid Base64', 'body.image_base64');
  }

  const reportedMime = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : null;
  if (reportedMime && !TYPE_CONFIG[reportedMime]) {
    throw createValidationError('Only JPEG, PNG, and WebP dish images are allowed', 'body.image_base64');
  }

  const { buffer } = decodeBase64Payload(dataUrlMatch ? dataUrlMatch[2] : rawValue);
  const detectedMime = detectImageMime(buffer);
  const type = TYPE_CONFIG[detectedMime];

  if (!type || (reportedMime && reportedMime !== detectedMime)) {
    throw createValidationError('Only JPEG, PNG, and WebP dish images are allowed', 'body.image_base64');
  }

  return {
    fieldname: 'image',
    originalname: input.filename || `dish.${type.ext}`,
    mimetype: detectedMime,
    size: buffer.length,
    buffer,
    validationField: 'body.image_base64',
  };
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

async function storeBase64DishImage(input, context = {}) {
  const file = parseBase64ImageInput(input);
  return storeDishImage(file, context);
}

module.exports = {
  storeDishImage,
  storeBase64DishImage,
  detectImageMime,
  parseBase64ImageInput,
};
