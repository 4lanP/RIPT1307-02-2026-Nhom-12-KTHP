const express = require('express');
const router = express.Router();

// Health Check
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Kiểm tra trạng thái server
 *     responses:
 *       200:
 *         description: Server đang hoạt động
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "ok" }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'Hệ thống đang hoạt động' });
});

const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const kdsRoutes = require('./kds.routes');
const staffRoutes = require('./staff.routes');
const webhookRoutes = require('./webhook.routes');
const adminRoutes = require('./admin.routes');

// API Routes
router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/kds', kdsRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
