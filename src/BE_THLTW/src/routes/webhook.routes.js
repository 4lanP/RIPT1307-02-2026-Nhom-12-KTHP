const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { validate } = require('../middlewares/validate.middleware');
const { webhookPayloadSchema } = require('../validators/payment.validator');

// VNPay gọi qua IPN Webhook (cả GET và POST tùy thiết lập VNPay)
/**
 * @swagger
 * /webhooks/vnpay:
 *   get:
 *     tags: [Webhooks]
 *     summary: Nhận callback từ VNPay (IPN Webhook)
 *     responses:
 *       200:
 *         description: Trả về trạng thái xử lý cho VNPay
 *   post:
 *     tags: [Webhooks]
 *     summary: Nhận callback từ VNPay (IPN Webhook)
 *     responses:
 *       200:
 *         description: Trả về trạng thái xử lý cho VNPay
 */
router.get('/vnpay', validate(webhookPayloadSchema), webhookController.vnpayWebhook);
router.post('/vnpay', validate(webhookPayloadSchema), webhookController.vnpayWebhook);

module.exports = router;
