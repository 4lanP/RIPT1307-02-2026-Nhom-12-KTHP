const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateStaff, authorizeStaffRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createDishImageUpload } = require('../middlewares/upload.middleware');
const {
  idParamSchema,
  createUserSchema,
  updateUserSchema,
  createTableSchema,
  updateTableSchema,
  listQrCodesSchema,
  createQrCodeSchema,
  createCategorySchema,
  updateCategorySchema,
  listItemsSchema,
  createItemSchema,
  updateItemSchema,
  menuItemIdParamSchema,
  createOptionSchema,
  updateOptionSchema,
  emptySchema,
  revenueReportSchema,
  exportReportSchema,
} = require('../validators/admin.validator');

const ADMIN_ROLES = ['ADMIN'];
const OPERATIONAL_ADMIN_ROLES = ['ADMIN', 'MANAGER'];

router.use(authenticateStaff(OPERATIONAL_ADMIN_ROLES));

/**
 * @swagger
 * /admin/reports/revenue:
 *   get:
 *     tags: [Admin]
 *     summary: Xem báo cáo doanh thu
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: group_by
 *         schema: { type: string, enum: [day, week, month] }
 *     responses:
 *       200:
 *         description: Báo cáo doanh thu
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
router.get('/reports/revenue', validate(revenueReportSchema), adminController.getRevenue);

/**
 * @swagger
 * /admin/reports/menu:
 *   get:
 *     tags: [Admin]
 *     summary: Xem báo cáo món ăn
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: Báo cáo món ăn
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
router.get('/reports/menu', validate(emptySchema), adminController.getMenuReport);

/**
 * @swagger
 * /admin/reports/kds:
 *   get:
 *     tags: [Admin]
 *     summary: Xem báo cáo hiệu suất KDS
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: Báo cáo KDS
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
router.get('/reports/kds', validate(emptySchema), adminController.getKdsReport);

/**
 * @swagger
 * /admin/reports/export:
 *   get:
 *     tags: [Admin]
 *     summary: Xuất báo cáo ra Excel
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: File excel báo cáo
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
router.get('/reports/export', validate(exportReportSchema), adminController.exportReport);

/**
 * @swagger
 * /admin/menu/reset-quota:
 *   post:
 *     tags: [Admin]
 *     summary: Reset lại quota các món ăn
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: Reset quota thành công
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
router.post('/menu/reset-quota', validate(emptySchema), adminController.resetMenuQuota);

router.get('/users', authorizeStaffRoles(ADMIN_ROLES), validate(emptySchema), adminController.listUsers);
router.post('/users', authorizeStaffRoles(ADMIN_ROLES), validate(createUserSchema), adminController.createUser);
router.put('/users/:id', authorizeStaffRoles(ADMIN_ROLES), validate(updateUserSchema), adminController.updateUser);
router.delete('/users/:id', authorizeStaffRoles(ADMIN_ROLES), validate(idParamSchema), adminController.deleteUser);

router.get('/tables', validate(emptySchema), adminController.listTables);
router.post('/tables', validate(createTableSchema), adminController.createTable);
router.put('/tables/:id', validate(updateTableSchema), adminController.updateTable);
router.delete('/tables/:id', validate(idParamSchema), adminController.deleteTable);

router.get('/qr_codes', validate(listQrCodesSchema), adminController.listQrCodes);
router.post('/qr_codes', validate(createQrCodeSchema), adminController.createQrCode);
router.patch('/qr_codes/:id/toggle', validate(idParamSchema), adminController.toggleQrCode);
router.delete('/qr_codes/:id', validate(idParamSchema), adminController.deleteQrCode);

router.get('/menu/categories', validate(emptySchema), adminController.listCategories);
router.post('/menu/categories', validate(createCategorySchema), adminController.createCategory);
router.put('/menu/categories/:id', validate(updateCategorySchema), adminController.updateCategory);
router.delete('/menu/categories/:id', validate(idParamSchema), adminController.deleteCategory);

router.get('/menu/items', validate(listItemsSchema), adminController.listItems);
router.post('/menu/images', createDishImageUpload(), adminController.uploadMenuImage);
router.post('/menu/items', validate(createItemSchema), adminController.createItem);
router.put('/menu/items/:id', validate(updateItemSchema), adminController.updateItem);
router.delete('/menu/items/:id', validate(idParamSchema), adminController.deleteItem);
router.get('/menu/items/:id/options', validate(menuItemIdParamSchema), adminController.listOptions);
router.post('/menu/items/:id/options', validate(createOptionSchema), adminController.createOption);
router.put('/menu/options/:id', validate(updateOptionSchema), adminController.updateOption);
router.delete('/menu/options/:id', validate(idParamSchema), adminController.deleteOption);

// ==========================================
// ADMIN CRUD ENDPOINTS (For Swagger Documentation)
// ==========================================

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Danh sách nhân viên
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200:
 *         description: Danh sách users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:        { type: integer }
 *                       email:     { type: string }
 *                       full_name: { type: string }
 *                       role:      { type: string, enum: [ADMIN, MANAGER, CASHIER, KITCHEN, WAITER] }
 *                       is_active: { type: boolean }
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
 *   post:
 *     tags: [Admin]
 *     summary: Tạo tài khoản nhân viên mới
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, full_name, role]
 *             properties:
 *               email:     { type: string, example: "nhanvien@restaurant.com" }
 *               password:  { type: string, example: "Password123!" }
 *               full_name: { type: string, example: "Nguyễn Văn A" }
 *               phone_number: { type: string }
 *               role:      { type: string, enum: [ADMIN, MANAGER, CASHIER, KITCHEN, WAITER] }
 *     responses:
 *       201: 
 *         description: Tạo thành công 
 *       409: 
 *         description: Email đã tồn tại 
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
 * 
 * /admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Cập nhật thông tin nhân viên
 *     description: "🔐 Yêu cầu role: ADMIN"
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
 *               full_name:    { type: string }
 *               phone_number: { type: string }
 *               role:         { type: string, enum: [ADMIN, MANAGER, CASHIER, KITCHEN, WAITER] }
 *               is_active:    { type: boolean }
 *     responses:
 *       200: 
 *         description: Cập nhật thành công 
 *       404: 
 *         description: User không tồn tại 
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
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags: [Admin]
 *     summary: Vô hiệu hoá tài khoản (soft delete — set is_active = false)
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Vô hiệu hoá thành công 
 *       404: 
 *         description: User không tồn tại 
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
 *       500:
 *         description: Lỗi server nội bộ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /admin/tables:
 *   get:
 *     tags: [Admin]
 *     summary: Danh sách bàn (kèm zone, capacity, status)
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   post:
 *     tags: [Admin]
 *     summary: Tạo bàn mới
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/tables/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Cập nhật tên/zone/capacity
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   delete:
 *     tags: [Admin]
 *     summary: Xoá bàn (chỉ khi status = AVAILABLE)
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/qr_codes:
 *   get:
 *     tags: [Admin]
 *     summary: Danh sách QR theo table_id
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   post:
 *     tags: [Admin]
 *     summary: Tạo QR mới cho bàn (body { table_id })
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/qr_codes/{id}/toggle:
 *   patch:
 *     tags: [Admin]
 *     summary: Bật/tắt QR (is_active)
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/qr_codes/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Xoá QR
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/menu/categories:
 *   get:
 *     tags: [Admin]
 *     summary: Lấy danh sách category
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   post:
 *     tags: [Admin]
 *     summary: Tạo category
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/menu/categories/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Sửa category
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   delete:
 *     tags: [Admin]
 *     summary: Xóa category
 *     description: "🔐 Yêu cầu role: ADMIN. Chỉ khi không có item nào đang active."
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/menu/items:
 *   get:
 *     tags: [Admin]
 *     summary: Lấy danh sách items
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   post:
 *     tags: [Admin]
 *     summary: Tạo item mới
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/menu/items/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Cập nhật item
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   delete:
 *     tags: [Admin]
 *     summary: Xóa item
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/menu/items/{id}/options:
 *   get:
 *     tags: [Admin]
 *     summary: Lấy options của item
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   post:
 *     tags: [Admin]
 *     summary: Tạo option cho item
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 * 
 * /admin/menu/options/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Cập nhật option
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *   delete:
 *     tags: [Admin]
 *     summary: Xóa option
 *     description: "🔐 Yêu cầu role: ADMIN"
 *     security:
 *       - StaffAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: 
 *         description: Thành công
 *       401:
 *         description: Token không hợp lệ
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 *       403:
 *         description: Không đủ quyền
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
 */

module.exports = router;
