require('dotenv').config();
const { validateEnv } = require('./utils/validateEnv');
const logger = require('./utils/logger');

validateEnv();

const http = require('http');
const app = require('./app');
const setupSockets = require('./sockets');
const cron = require('node-cron');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = setupSockets(server);
app.set('io', io);

cron.schedule('0 0 * * *', async () => {
  try {
    logger.info('Running daily quota reset...');
    await db.query('UPDATE MENU_ITEMS SET daily_quota = daily_quota_default');
    logger.info('Daily quota reset successfully.');
  } catch (error) {
    logger.error('Error resetting daily quota', {
      error: error.message,
      stack: error.stack,
    });
  }
}, {
  timezone: 'Asia/Ho_Chi_Minh',
});

server.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    pid: process.pid,
  });
});
