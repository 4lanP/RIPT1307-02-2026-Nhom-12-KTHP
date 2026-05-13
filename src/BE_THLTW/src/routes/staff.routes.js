const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { authenticateStaff, authorizeStaffRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema, checkoutCashSchema, cancelItemSchema, emptySchema } = require('../validators/staff.validator');

const STAFF_ACCESS_ROLES = ['CASHIER', 'MANAGER', 'ADMIN', 'WAITER'];
const CASHIER_ACCESS_ROLES = ['CASHIER', 'MANAGER', 'ADMIN'];
const MANAGER_ACCESS_ROLES = ['MANAGER', 'ADMIN'];

router.use(authenticateStaff(STAFF_ACCESS_ROLES));

/**
 * @swagger
 * /staff/tables:
 *   get:
 *     tags: [Staff]
 *     summary: Lấy danh sách bàn
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bàn
 *         content:
 *           application/json:
 *             schema:
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       table_id:          { type: integer }
 *                       table_name:        { type: string, example: "Bàn 01" }
 *                       zone:              { type: string, example: "Tầng 1" }
 *                       capacity:          { type: integer }
 *                       status:            { type: string, enum: [AVAILABLE, OCCUPIED] }
 *                       active_session_id:
 *                         type: integer
 *                         nullable: true
 *                         description: "null nếu bàn đang AVAILABLE"
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
router.get('/tables', validate(emptySchema), staffController.getTables);

/**
 * @swagger
 * /staff/tables/{id}/session:
 *   get:
 *     tags: [Staff]
 *     summary: Lấy session hiện tại của bàn
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết session
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
router.get('/tables/:id/session', validate(idParamSchema), staffController.getTableSession);

/**
 * @swagger
 * /staff/sessions/{id}/checkout:
 *   post:
 *     tags: [Staff]
 *     summary: Thanh toán bằng tiền mặt
 *     description: "🔐 Yêu cầu role: CASHIER, MANAGER hoặc ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               amount: { type: number }
 *     responses:
 *       200:
 *         description: Thanh toán thành công
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
router.post(
  '/sessions/:id/checkout',
  authorizeStaffRoles(CASHIER_ACCESS_ROLES),
  validate(checkoutCashSchema),
  staffController.checkoutCash
);

/**
 * @swagger
 * /staff/requests:
 *   get:
 *     tags: [Staff]
 *     summary: Lấy danh sách yêu cầu của khách hàng
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu
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
router.get('/requests', validate(emptySchema), staffController.getRequests);

/**
 * @swagger
 * /staff/requests/{id}/resolve:
 *   patch:
 *     tags: [Staff]
 *     summary: Giải quyết yêu cầu
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Giải quyết thành công
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
router.patch('/requests/:id/resolve', validate(idParamSchema), staffController.resolveRequest);

/**
 * @swagger
 * /staff/orders/items/{id}/cancel:
 *   patch:
 *     tags: [Staff]
 *     summary: Hủy món ăn
 *     description: "🔐 Yêu cầu role: CASHIER, MANAGER hoặc ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               cancel_reason: { type: string }
 *     responses:
 *       200:
 *         description: Hủy món thành công
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
router.patch(
  '/orders/items/:id/cancel',
  authorizeStaffRoles(CASHIER_ACCESS_ROLES),
  validate(cancelItemSchema),
  staffController.cancelItem
);

/**
 * @swagger
 * /staff/sessions/{id}/force-close:
 *   post:
 *     tags: [Staff]
 *     summary: Đóng session khẩn cấp (không cần thanh toán)
 *     description: "⚠️ Chỉ dành cho MANAGER và ADMIN. Dùng khi có sự cố cần giải phóng bàn."
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Đóng session thành công
 *       401:
 *         description: Token không hợp lệ hoặc hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403: 
 *         description: Không đủ quyền (cần MANAGER hoặc ADMIN)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404: 
 *         description: Session không tồn tại
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
router.post(
  '/sessions/:id/force-close',
  authorizeStaffRoles(MANAGER_ACCESS_ROLES),
  validate(idParamSchema),
  staffController.forceCloseSession
);

module.exports = router;

