const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticateSession } = require('../middlewares/auth.middleware');
const { scanRateLimiter } = require('../middlewares/rateLimit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  scanSchema,
  getMenuSchema,
  createOrderSchema,
  createRequestSchema,
  createPaymentSchema,
  emptySchema,
} = require('../validators/customer.validator');

/**
 * @swagger
 * /customer/scan:
 *   post:
 *     tags: [Customer]
 *     summary: Quét mã QR để mở session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qr_code]
 *             properties:
 *               qr_code: { type: string, example: "QR-Bàn-01-abc123" }
 *     responses:
 *       200:
 *         description: Tạo session thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   properties:
 *                     session_token: { type: string }
 *                     table_name:    { type: string, example: "Bàn 01" }
 *       404:
 *         description: Mã QR không hợp lệ
 *       409:
 *         description: Bàn đang có khách
 */
router.post('/scan', scanRateLimiter, validate(scanSchema), customerController.scan);

/**
 * @swagger
 * /customer/session:
 *   get:
 *     tags: [Customer]
 *     summary: Lấy thông tin session hiện tại
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Thông tin session hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:              { type: integer }
 *                     table_name:      { type: string, example: "Bàn 01" }
 *                     status:          { type: string, enum: [ACTIVE, CLOSED, CANCELLED] }
 *                     subtotal:        { type: number, example: 240000 }
 *                     discount_amount: { type: number, example: 0 }
 *                     tax_amount:      { type: number, example: 19200 }
 *                     final_amount:    { type: number, example: 259200 }
 *                     started_at:      { type: string, format: date-time }
 *                     version:
 *                       type: integer
 *                       example: 1
 *                       description: "Gửi kèm field này trong body khi gọi POST /customer/orders"
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/session', authenticateSession, validate(emptySchema), customerController.getSession);

/**
 * @swagger
 * /customer/menu:
 *   get:
 *     tags: [Customer]
 *     summary: Lấy toàn bộ menu (categories → items → options)
 *     security:
 *       - SessionAuth: []
 *     parameters:
 *       - in: query
 *         name: station
 *         schema:
 *           type: string
 *           enum: [GRILL, BAR, COLD]
 *     responses:
 *       200:
 *         description: Danh sách menu nested
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/menu', authenticateSession, validate(getMenuSchema), customerController.getMenu);

/**
 * @swagger
 * /customer/requests:
 *   post:
 *     tags: [Customer]
 *     summary: Gọi nhân viên
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               request_type: { type: string, enum: [CALL_STAFF, REQUEST_BILL, OTHER] }
 *     responses:
 *       201:
 *         description: Tạo request thành công
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/requests', authenticateSession, validate(createRequestSchema), customerController.createRequest);

/**
 * @swagger
 * /customer/orders:
 *   post:
 *     tags: [Customer]
 *     summary: Đặt món
 *     security:
 *       - SessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [session_version, items]
 *             properties:
 *               session_version:
 *                 type: integer
 *                 description: Dùng cho Optimistic Locking — lấy từ GET /customer/session
 *                 example: 1
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id: { type: integer }
 *                     quantity:     { type: integer, minimum: 1 }
 *                     note:         { type: string }
 *                     options:
 *                       type: array
 *                       items:
 *                         properties:
 *                           option_id: { type: integer }
 *                           quantity:  { type: integer }
 *     responses:
 *       201:
 *         description: Đặt món thành công
 *       400:
 *         description: Món hết quota hoặc không khả dụng
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Session version mismatch (Optimistic Lock)
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     tags: [Customer]
 *     summary: Lấy danh sách đơn hàng đã đặt
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:         { type: integer }
 *                       status:     { type: string, enum: [PENDING, CONFIRMED, PREPARING, READY, SERVED, CANCELLED] }
 *                       note:       { type: string }
 *                       created_at: { type: string, format: date-time }
 *                       items:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/OrderItem'
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/orders', authenticateSession, validate(createOrderSchema), customerController.createOrder);
router.get('/orders', authenticateSession, validate(emptySchema), customerController.getOrders);

/**
 * @swagger
 * /customer/payment/vnpay:
 *   post:
 *     tags: [Customer]
 *     summary: Tạo link thanh toán VNPay
 *     security:
 *       - SessionAuth: []
 *     responses:
 *       200:
 *         description: Tạo link thành công
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 data:
 *                   properties:
 *                     payment_url:
 *                       type: string
 *                       example: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=..."
 *                       description: "Redirect người dùng đến URL này để thanh toán"
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không đủ quyền truy cập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/payment/vnpay', authenticateSession, validate(createPaymentSchema), customerController.createPayment);

module.exports = router;

