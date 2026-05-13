const express = require('express');
const router = express.Router();
const kdsController = require('../controllers/kds.controller');
const { authenticateStaff } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateItemStatusSchema, getOrdersSchema } = require('../validators/kds.validator');

// Các endpoints KDS yêu cầu role KITCHEN
router.use(authenticateStaff(['KITCHEN']));

/**
 * @swagger
 * /kds/orders:
 *   get:
 *     tags: [KDS]
 *     summary: Lấy danh sách món đang chờ chế biến theo station
 *     description: "🔐 Yêu cầu role: KITCHEN (hoặc ADMIN, MANAGER để debug)"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: query
 *         name: station
 *         required: true
 *         schema:
 *           type: string
 *           enum: [GRILL, BAR, COLD]
 *     responses:
 *       200:
 *         description: Danh sách orders grouped theo order_id
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       order_id:   { type: integer }
 *                       table_name: { type: string }
 *                       created_at: { type: string, format: date-time }
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:           { type: integer }
 *                             name:         { type: string }
 *                             quantity:     { type: integer }
 *                             note:         { type: string }
 *                             status:       { type: string, enum: [PENDING, PREPARING, READY] }
 *                             options:
 *                               type: array
 *                               items:
 *                                 properties:
 *                                   option_name: { type: string }
 *                                   quantity:    { type: integer }
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
router.get('/orders', validate(getOrdersSchema), kdsController.getOrders);

/**
 * @swagger
 * /kds/items/{id}/status:
 *   patch:
 *     tags: [KDS]
 *     summary: Cập nhật trạng thái món (PREPARING → READY)
 *     description: "🔐 Yêu cầu role: KITCHEN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               new_status:
 *                 type: string
 *                 enum: [PREPARING, READY, SERVED]
 *     responses:
 *       200:
 *         description: Cập nhật thành công, có thể kèm thay đổi Order status
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
router.patch('/items/:id/status', validate(updateItemStatusSchema), kdsController.updateItemStatus);

module.exports = router;

