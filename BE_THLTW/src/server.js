require('dotenv').config();
const http = require('http');
const app = require('./app');
const setupSockets = require('./sockets');
const cron = require('node-cron');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Setup Socket.io
const io = setupSockets(server);
// Để các controller có thể truy cập io, ta gán vào app
app.set('io', io);

// Setup node-cron jobs (VD: reset daily_quota lúc nửa đêm)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily quota reset...');
    await db.query('UPDATE MENU_ITEMS SET daily_quota = daily_quota_default');
    console.log('Daily quota reset successfully.');
  } catch (error) {
    console.error('Error resetting daily quota:', error);
  }
}, {
  timezone: 'Asia/Ho_Chi_Minh',
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode.`);
});
