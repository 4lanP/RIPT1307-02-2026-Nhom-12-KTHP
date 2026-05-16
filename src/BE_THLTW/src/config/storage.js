const path = require('path');

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_PUBLIC_PATH = '/uploads/dish-images';
const DEFAULT_PUBLIC_BASE_URL = `http://localhost:${process.env.PORT || 5000}${DEFAULT_PUBLIC_PATH}`;

function parseMaxBytes(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_MAX_BYTES;
}

function normalizeBaseUrl(value) {
  const baseUrl = value || DEFAULT_PUBLIC_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
}

const dishImageStorage = {
  directory: process.env.DISH_IMAGE_STORAGE_DIR || path.join(process.cwd(), 'uploads', 'dish-images'),
  publicBaseUrl: normalizeBaseUrl(process.env.DISH_IMAGE_PUBLIC_BASE_URL),
  maxBytes: parseMaxBytes(process.env.DISH_IMAGE_MAX_BYTES),
  publicPath: DEFAULT_PUBLIC_PATH,
};

module.exports = {
  dishImageStorage,
  DEFAULT_MAX_BYTES,
};
