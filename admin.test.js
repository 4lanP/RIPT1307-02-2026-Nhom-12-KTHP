/**
 * TEST SUITE: Admin Service
 * Covers:
 *   - CRUD Menu (category, item, option)
 *   - CRUD Table & QR Code
 *   - CRUD User management
 *   - Revenue Reports
 *   - Role-based access (ADMIN vs MANAGER)
 *
 * Module được test: src/services/admin.service.js
 */

require('./helpers/mockDb');
const { mockClient, mockPool } = require('./helpers/mockDb');

// ─────────────────────────────────────────────────────────────
// NHÓM 1: Quản lý người dùng (ADMIN only)
// ─────────────────────────────────────────────────────────────
describe('Admin Service — User Management (ADMIN only)', () => {

  let adminService;
  beforeEach(() => { jest.resetModules(); adminService = require('../src/services/admin.service'); });

  it('TC-ADMIN-01: ADMIN tạo user mới với đầy đủ thông tin hợp lệ → trả về user mới (không có password_hash)', async () => {
    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password');

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // CHECK email trùng
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 10, email: 'staff@restaurant.com', full_name: 'Nhân Viên Mới', role: 'WAITER', is_active: true }],
    }); // INSERT user
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.createUser({
      email: 'staff@restaurant.com',
      password: 'Password123!',
      full_name: 'Nhân Viên Mới',
      role: 'WAITER',
    });

    expect(result.email).toBe('staff@restaurant.com');
    expect(result).not.toHaveProperty('password_hash');
    expect(result.role).toBe('WAITER');
  });

  it('TC-ADMIN-02: Tạo user với email đã tồn tại → ném ConflictError (409)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'existing@restaurant.com' }],
    }); // email đã tồn tại
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(adminService.createUser({
      email: 'existing@restaurant.com',
      password: 'pass',
      full_name: 'Test',
      role: 'WAITER',
    })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('TC-ADMIN-03: Cập nhật role user thành công', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 5, role: 'WAITER' }] }); // SELECT user
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 5, role: 'CASHIER', is_active: true }],
    }); // UPDATE user
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.updateUser(5, { role: 'CASHIER' });

    expect(result.role).toBe('CASHIER');
  });

  it('TC-ADMIN-04: Deactivate user (is_active = false) thành công', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 5 }] }); // SELECT user
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 5, is_active: false }],
    }); // UPDATE
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.updateUser(5, { is_active: false });
    expect(result.is_active).toBe(false);
  });

  it('TC-ADMIN-05: Xóa user không tồn tại → ném NotFoundError (404)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(adminService.deleteUser(9999))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('TC-ADMIN-06: Lấy danh sách tất cả users → trả về mảng (không có password_hash)', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, email: 'admin@r.com', role: 'ADMIN', is_active: true },
        { id: 2, email: 'waiter@r.com', role: 'WAITER', is_active: true },
      ],
    });

    const result = await adminService.getUsers();

    expect(result).toHaveLength(2);
    result.forEach(u => expect(u).not.toHaveProperty('password_hash'));
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 2: Quản lý Menu (MANAGER+)
// ─────────────────────────────────────────────────────────────
describe('Admin Service — Menu Management', () => {

  let adminService;
  beforeEach(() => { jest.resetModules(); adminService = require('../src/services/admin.service'); });

  it('TC-MENU-ADMIN-01: Tạo category mới hợp lệ → trả về category', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 5, name: 'Lẩu', station: 'GRILL', sort_order: 3, is_active: true }],
    }); // INSERT
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.createCategory({ name: 'Lẩu', station: 'GRILL', sort_order: 3 });

    expect(result.name).toBe('Lẩu');
    expect(result.station).toBe('GRILL');
  });

  it('TC-MENU-ADMIN-02: Tạo menu item với daily_quota → quota được set', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // CHECK category exists
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 20, name: 'Sườn đặc biệt', price: 120000, daily_quota: 50 }],
    }); // INSERT
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.createMenuItem({
      category_id: 1,
      name: 'Sườn đặc biệt',
      price: 120000,
      daily_quota: 50,
    });

    expect(result.daily_quota).toBe(50);
  });

  it('TC-MENU-ADMIN-03: Tạo menu item với category_id không tồn tại → ném NotFoundError (404)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT category → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(adminService.createMenuItem({ category_id: 999, name: 'Test', price: 50000 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('TC-MENU-ADMIN-04: Cập nhật is_available = false → món bị ẩn khỏi menu', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 20 }] }); // SELECT item
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 20, is_available: false }],
    }); // UPDATE
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.updateMenuItem(20, { is_available: false });
    expect(result.is_available).toBe(false);
  });

  it('TC-MENU-ADMIN-05: Reset daily_quota cho toàn bộ menu → tất cả items được reset', async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 25 }); // UPDATE all items

    const result = await adminService.resetAllDailyQuota();

    const queryCall = mockPool.query.mock.calls[0][0];
    expect(queryCall).toContain('UPDATE MENU_ITEMS SET daily_quota');
    expect(result.updated).toBe(25);
  });

  it('TC-MENU-ADMIN-06: Xóa menu item đang có order_item đang active → ném ConflictError (409)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ count: '2' }],
    }); // CHECK active order items
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(adminService.deleteMenuItem(20))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('TC-MENU-ADMIN-07: Thêm option vào menu item → option được tạo', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 20 }] }); // SELECT item
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 50, option_group: 'Size', option_name: 'L', extra_price: 10000 }],
    }); // INSERT option
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.createMenuItemOption(20, {
      option_group: 'Size', option_name: 'L', extra_price: 10000,
    });

    expect(result.option_name).toBe('L');
    expect(result.extra_price).toBe(10000);
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 3: Quản lý Bàn & QR Code
// ─────────────────────────────────────────────────────────────
describe('Admin Service — Table & QR Management', () => {

  let adminService;
  beforeEach(() => { jest.resetModules(); adminService = require('../src/services/admin.service'); });

  it('TC-TABLE-01: Tạo bàn mới với tên và zone → trả về table mới', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // CHECK tên trùng
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 10, name: 'Bàn 10', zone: 'Tầng 2', capacity: 4, status: 'AVAILABLE' }],
    }); // INSERT
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.createTable({ name: 'Bàn 10', zone: 'Tầng 2', capacity: 4 });
    expect(result.name).toBe('Bàn 10');
    expect(result.status).toBe('AVAILABLE');
  });

  it('TC-TABLE-02: Tạo bàn với tên đã tồn tại → ném ConflictError (409)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // CHECK → tên trùng
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(adminService.createTable({ name: 'Bàn 01', zone: 'A', capacity: 4 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('TC-TABLE-03: Xóa bàn đang OCCUPIED → ném ConflictError (409)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'OCCUPIED' }] }); // SELECT table
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(adminService.deleteTable(1))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('TC-TABLE-04: Tạo QR code cho bàn → QR được tạo với code unique', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // SELECT table
    mockClient.query.mockResolvedValueOnce({}); // Deactivate old QR
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 20, table_id: 1, code: 'QR-Ban-01-new123', is_active: true }],
    }); // INSERT QR
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.createQrCode(1);

    expect(result.is_active).toBe(true);
    expect(result.code).toContain('QR');
  });

  it('TC-TABLE-05: Tái tạo QR (regenerate) → QR cũ bị deactivate, QR mới được tạo', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // SELECT table
    mockClient.query.mockResolvedValueOnce({}); // UPDATE old QR is_active = false
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 21, code: 'QR-Ban-01-regen456', is_active: true }] }); // INSERT new QR
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await adminService.regenerateQrCode(1);

    const deactivateCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('is_active = false')
    );
    expect(deactivateCall).toBeDefined();
    expect(result.is_active).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 4: Reports & Dashboard
// ─────────────────────────────────────────────────────────────
describe('Admin Service — Reports & Dashboard', () => {

  let adminService;
  beforeEach(() => { jest.resetModules(); adminService = require('../src/services/admin.service'); });

  it('TC-RPT-01: Dashboard trả về số bàn active, doanh thu hôm nay, đơn pending', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ occupied_tables: '3' }] }) // bàn OCCUPIED
      .mockResolvedValueOnce({ rows: [{ revenue_today: '1500000' }] }) // doanh thu hôm nay
      .mockResolvedValueOnce({ rows: [{ pending_orders: '5' }] }); // đơn PENDING

    const result = await adminService.getDashboard();

    expect(result.occupied_tables).toBe(3);
    expect(result.revenue_today).toBe(1500000);
    expect(result.pending_orders).toBe(5);
  });

  it('TC-RPT-02: Báo cáo doanh thu theo ngày với from/to hợp lệ → trả về mảng data', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { date: '2024-01-01', revenue: '500000', order_count: '5' },
        { date: '2024-01-02', revenue: '750000', order_count: '8' },
      ],
    });

    const result = await adminService.getRevenueReport({ from: '2024-01-01', to: '2024-01-07', group_by: 'day' });

    expect(result).toHaveLength(2);
    expect(result[0].revenue).toBeDefined();
  });

  it('TC-RPT-03: Báo cáo top món bán chạy → trả về danh sách items với total_sold', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { menu_item_id: 1, name: 'Sườn nướng', total_sold: 150, total_revenue: '12000000' },
        { menu_item_id: 2, name: 'Nước cam', total_sold: 200, total_revenue: '6000000' },
      ],
    });

    const result = await adminService.getTopMenuItems({ from: '2024-01-01', to: '2024-01-31' });

    expect(result[0].total_sold).toBe(150);
    expect(result[1].name).toBe('Nước cam');
  });

  it('TC-RPT-04: from > to trong params báo cáo → ném ValidationError (400)', async () => {
    await expect(adminService.getRevenueReport({ from: '2024-12-31', to: '2024-01-01', group_by: 'day' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('TC-RPT-05: KDS performance report theo station → trả về avg_prepare_time mỗi trạm', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { station: 'GRILL', avg_prepare_seconds: '180', total_items: '50' },
        { station: 'BAR', avg_prepare_seconds: '60', total_items: '120' },
        { station: 'COLD', avg_prepare_seconds: '45', total_items: '30' },
      ],
    });

    const result = await adminService.getKDSPerformance({ from: '2024-01-01', to: '2024-01-31' });

    expect(result).toHaveLength(3);
    expect(result.find(r => r.station === 'GRILL').avg_prepare_seconds).toBe('180');
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 5: RBAC Admin vs Manager
// ─────────────────────────────────────────────────────────────
describe('RBAC — ADMIN vs MANAGER permissions', () => {

  it('TC-RBAC-ADMIN-01: MANAGER không thể tạo user (ADMIN only) → middleware từ chối 403', () => {
    const { authorizeStaffRoles } = require('../src/middlewares/auth.middleware');
    const { req, res, next } = (() => {
      const req = { headers: {}, user: { id: 2, role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      return { req, res, next };
    })();

    authorizeStaffRoles(['ADMIN'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('TC-RBAC-ADMIN-02: ADMIN có thể tạo user → middleware cho qua', () => {
    const { authorizeStaffRoles } = require('../src/middlewares/auth.middleware');
    const { req, res, next } = (() => {
      const req = { headers: {}, user: { id: 1, role: 'ADMIN' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      return { req, res, next };
    })();

    authorizeStaffRoles(['ADMIN'])(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('TC-RBAC-ADMIN-03: MANAGER có thể truy cập reports → middleware cho qua', () => {
    const { authorizeStaffRoles } = require('../src/middlewares/auth.middleware');
    const { req, res, next } = (() => {
      const req = { headers: {}, user: { id: 2, role: 'MANAGER' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      return { req, res, next };
    })();

    authorizeStaffRoles(['ADMIN', 'MANAGER'])(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
