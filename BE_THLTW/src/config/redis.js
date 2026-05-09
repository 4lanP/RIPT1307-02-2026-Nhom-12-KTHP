const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

function createRedisClient() {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not configured. Webhook idempotency will use database fallback.');
    return null;
  }

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  client.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return client;
}

function getRedisClient() {
  if (!redis) {
    redis = createRedisClient();
  }
  return redis;
}

async function acquireLock(key, ttlSeconds = 60) {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const result = await client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.error('Redis lock acquisition failed', { key, error: error.message });
    return null;
  }
}

async function releaseLock(key) {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    logger.error('Redis lock release failed', { key, error: error.message });
  }
}

module.exports = {
  getRedisClient,
  acquireLock,
  releaseLock,
};
