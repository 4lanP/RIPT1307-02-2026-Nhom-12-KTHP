const logger = require('../utils/logger');
const keepaliveService = require('../services/keepalive.service');
const dailyRevenueEmailService = require('../services/dailyRevenueEmail.service');

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'VNPAY_TMNCODE',
  'VNPAY_HASHSECRET',
  'VNPAY_URL',
  'VNPAY_RETURN_URL',
];

const optionalEnvVars = [
  'PORT',
  'NODE_ENV',
  'FRONTEND_URL',
  'REDIS_URL',
  'LOG_LEVEL',
  'DISH_IMAGE_STORAGE_DIR',
  'DISH_IMAGE_PUBLIC_BASE_URL',
  'DISH_IMAGE_MAX_BYTES',
  'KEEPALIVE_ENABLED',
  'KEEPALIVE_TARGETS',
  'KEEPALIVE_INTERVAL_SECONDS',
  'KEEPALIVE_TIMEOUT_MS',
  'KEEPALIVE_RETRY_LIMIT',
  'KEEPALIVE_HISTORY_LIMIT',
  'REPORT_EMAIL_ENABLED',
  'REPORT_EMAIL_RECIPIENTS',
  'REPORT_EMAIL_CRON',
  'REPORT_EMAIL_TIMEZONE',
  'REPORT_EMAIL_HISTORY_LIMIT',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_TIMEOUT_MS',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'MAILTRAP_API_TOKEN',
  'MAILTRAP_API_URL',
  'MAILTRAP_FROM_EMAIL',
  'MAILTRAP_FROM_NAME',
];

function validateEnv() {
  const missing = [];
  const warnings = [];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  optionalEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  if (warnings.length > 0) {
    logger.warn('Optional environment variables not set', { warnings });
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_ACCESS_SECRET.length < 32) {
      logger.error('JWT_ACCESS_SECRET too short for production');
      throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production');
    }
    if (process.env.JWT_REFRESH_SECRET.length < 32) {
      logger.error('JWT_REFRESH_SECRET too short for production');
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL === '*') {
      logger.error('FRONTEND_URL must be set in production');
      throw new Error('FRONTEND_URL must be explicitly set in production (not *)');
    }
    if (!process.env.DISH_IMAGE_STORAGE_DIR) {
      logger.error('DISH_IMAGE_STORAGE_DIR must be set in production');
      throw new Error('DISH_IMAGE_STORAGE_DIR must be set in production');
    }
    if (!process.env.DISH_IMAGE_PUBLIC_BASE_URL) {
      logger.error('DISH_IMAGE_PUBLIC_BASE_URL must be set in production');
      throw new Error('DISH_IMAGE_PUBLIC_BASE_URL must be set in production');
    }
  }

  if (process.env.DISH_IMAGE_MAX_BYTES) {
    const maxBytes = Number.parseInt(process.env.DISH_IMAGE_MAX_BYTES, 10);
    if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
      logger.error('DISH_IMAGE_MAX_BYTES must be a positive integer');
      throw new Error('DISH_IMAGE_MAX_BYTES must be a positive integer');
    }
  }

  const keepaliveConfig = keepaliveService.buildConfig(process.env);
  if (keepaliveConfig.status === 'configuration-error') {
    logger.warn('Keepalive configuration invalid; scheduler will not start', {
      error: keepaliveConfig.startupError,
    });
  }

  const reportEmailConfig = dailyRevenueEmailService.buildConfig(process.env);
  if (reportEmailConfig.status === 'configuration-error') {
    logger.warn('Daily revenue email configuration invalid; scheduler will not start', {
      error: reportEmailConfig.startupError,
    });
  }

  logger.info('Environment validation passed', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 5000,
    hasRedis: !!process.env.REDIS_URL,
    hasDishImageStorage: !!process.env.DISH_IMAGE_STORAGE_DIR,
    keepaliveStatus: keepaliveConfig.status,
    reportEmailStatus: reportEmailConfig.status,
  });
}

module.exports = { validateEnv };
