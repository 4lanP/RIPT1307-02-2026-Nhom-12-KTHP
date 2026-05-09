const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  max: 20,
  min: 5,
});

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    code: err.code,
    reconnectAttempts,
  });

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    logger.info(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(async () => {
      try {
        await pool.query('SELECT 1');
        logger.info('Database reconnection successful');
        reconnectAttempts = 0;
      } catch (retryErr) {
        logger.error('Database reconnection failed', { error: retryErr.message });
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          logger.error('Max reconnection attempts reached. Exiting process.');
          process.exit(-1);
        }
      }
    }, RECONNECT_DELAY);
  } else {
    logger.error('Database connection lost permanently. Exiting process.');
    process.exit(-1);
  }
});

pool.on('connect', () => {
  logger.info('New database connection established');
  reconnectAttempts = 0;
});

async function queryWithRetry(text, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      logger.warn(`Query attempt ${attempt} failed`, {
        error: error.message,
        code: error.code,
      });

      if (attempt === retries || !isRetryableError(error)) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function isRetryableError(error) {
  const retryableCodes = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    '57P03', // cannot_connect_now
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
  ];
  return retryableCodes.includes(error.code);
}

module.exports = {
  query: queryWithRetry,
  connect: () => pool.connect(),
  pool,
};
