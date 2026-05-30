/**
 * TEST SUITE: Order Service
 * Covers: createOrder() — optimistic lock, quota, options, socket emit
 *         getSessionOrders() — format orders + items + options
 *
 * Module được test: src/services/order.service.js
 */

require('./helpers/mockDb');
const { mockClient, mockPool } = require('./helpers/mockDb');
const { mockOf, mockTo, mockEmit } = require('./helpers/mockSocket');

const orderService = require('../src/services/order.service');
const sessionService = require('../src/services/session.service');

jest.spyOn(sessionService, 'calculateSessionBill').mockResolvedValue();

// ─────────────────────────────────────────────────────────────
// NHÓM 1: createOrder() — Đặt món
// ─────────────────────────────────────────────────────────────
describe('Order Service — createOrder()', () => {

  function mockActiveSession(overrides = {}) {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 'sess_1', table_id: 1, status: 'ACTIVE', ...overrides }],
    }); // SELECT FOR UPDATE sessions
  }

  function mockAvailableItem(overrides = {}) {
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Sườn nướng', price: 80000, is_available: true, daily_quota: 10, ...overrides }],
    }); // SELECT MENU_ITEMS FOR UPDATE
    mockClient.query.mockResolvedValueOnce({ rows: [{ daily_quota: 9 }] }); // UPDATE quota RETURNING
  }

  function mockOrderInsert() {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'order_1' }] }); // INSERT ORDERS
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_1' }] }); // INSERT ORDER_ITEMS
  }

  function mockSocketEmit() {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ station: 'GRILL', station_items: [{ name: 'Sườn nướng' }] }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Bàn 01' }] });
  }

  // ── Happy path ──────────────────────────────────────────────
  it('TC-ORD-01: Đặt món hợp lệ (không option) → trả về order_id và emit socket /kitchen', async () => {
    mockActiveSession();
    mockAvailableItem();
    mockOrderInsert();
    mockClient.query.mockResolvedValueOnce({}); // UPDATE sessions version
    mockClient.query.mockResolvedValueOnce({}); // COMMIT
    mockSocketEmit();

    const result = await orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 1);

    expect(result.order_id).toBe('order_1');
    expect(mockOf).toHaveBeenCalledWith('/kitchen');
    expect(mockTo).toHaveBeenCalledWith('GRILL');
    expect(mockEmit).toHaveBeenCalledWith('new_order', expect.objectContaining({ table_name: 'Bàn 01' }));
  });

  it('TC-ORD-02: Đặt nhiều món cùng lúc → tất cả ORDER_ITEMS được tạo', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', table_id: 1, status: 'ACTIVE' }] });
    // Item 1
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Món A', price: 50000, is_available: true, daily_quota: 5 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ daily_quota: 4 }] });
    // Item 2
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Món B', price: 60000, is_available: true, daily_quota: 3 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ daily_quota: 2 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'order_1' }] }); // INSERT ORDERS
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_1' }] }); // INSERT ORDER_ITEMS 1
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_2' }] }); // INSERT ORDER_ITEMS 2
    mockClient.query.mockResolvedValueOnce({}); // UPDATE version
    mockClient.query.mockResolvedValueOnce({}); // COMMIT
    mockPool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ name: 'Bàn 01' }] });

    const result = await orderService.createOrder('sess_1', [
      { menu_item_id: 1, quantity: 1 },
      { menu_item_id: 2, quantity: 1 },
    ], 1);

    expect(result.order_id).toBe('order_1');
  });

  it('TC-ORD-03: Đặt món có options hợp lệ → ORDER_ITEM_OPTIONS được insert', async () => {
    mockActiveSession();
    mockAvailableItem();
    mockOrderInsert();
    mockClient.query.mockResolvedValueOnce({ rows: [{ extra_price: 5000 }] }); // SELECT option
    mockClient.query.mockResolvedValueOnce({}); // INSERT ORDER_ITEM_OPTIONS
    mockClient.query.mockResolvedValueOnce({}); // UPDATE version
    mockClient.query.mockResolvedValueOnce({}); // COMMIT
    mockSocketEmit();

    const result = await orderService.createOrder(
      'sess_1',
      [{ menu_item_id: 1, quantity: 1, options: [{ option_id: 10, quantity: 1 }] }],
      1
    );

    expect(result.order_id).toBe('order_1');
    const allCalls = mockClient.query.mock.calls.map(c => c[0]);
    expect(allCalls.some(q => typeof q === 'string' && q.includes('INSERT INTO ORDER_ITEM_OPTIONS'))).toBe(true);
  });

  it('TC-ORD-04: Đặt món có ghi chú (note) → note được lưu vào ORDER_ITEMS', async () => {
    mockActiveSession();
    mockAvailableItem();
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'order_1' }] }); // INSERT ORDERS
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_1' }] }); // INSERT ORDER_ITEMS with note
    mockClient.query.mockResolvedValueOnce({}); // UPDATE version
    mockClient.query.mockResolvedValueOnce({}); // COMMIT
    mockSocketEmit();

    await orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1, note: 'Không cay' }], 1);

    const insertItemCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO ORDER_ITEMS')
    );
    expect(insertItemCall[1]).toContain('Không cay');
  });

  // ── Optimistic Locking ────────────────────────────────────────
  it('TC-ORD-05: session_version không khớp (session đã được cập nhật) → ném ConflictError (409)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT session trả empty
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 99))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('TC-ORD-06: Session status = CLOSED → ném AuthorizationError (403)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', status: 'CLOSED' }] });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 1))
      .rejects.toMatchObject({ statusCode: 403, message: 'Session này đã bị đóng.' });
  });

  // ── Quota / Availability ──────────────────────────────────────
  it('TC-ORD-07: Món đã hết quota (daily_quota = 0) → ném ValidationError (400)', async () => {
    mockActiveSession();
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bò lúc lắc', is_available: true, daily_quota: 0 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE quota trả về empty (race condition)
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 1))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('không đủ số lượng') });
  });

  it('TC-ORD-08: Đặt số lượng lớn hơn quota còn lại → ném ValidationError (400)', async () => {
    mockActiveSession();
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bò lúc lắc', is_available: true, daily_quota: 2 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE trả empty vì qty=5 > quota=2
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 5 }], 1))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('TC-ORD-09: Món is_available = false → ném ValidationError (400)', async () => {
    mockActiveSession();
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Cá hồi', is_available: false, daily_quota: 10 }] });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 1))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('hiện không phục vụ') });
  });

  it('TC-ORD-10: menu_item_id không tồn tại → ném NotFoundError (404)', async () => {
    mockActiveSession();
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT MENU_ITEMS trả empty
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 9999, quantity: 1 }], 1))
      .rejects.toMatchObject({ statusCode: 404, message: expect.stringContaining('Không tìm thấy món ăn') });
  });

  it('TC-ORD-11: option_id không thuộc menu_item_id → ném ValidationError (400)', async () => {
    mockActiveSession();
    mockAvailableItem();
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'order_1' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_1' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT option → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(
      orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1, options: [{ option_id: 999 }] }], 1)
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Invalid option') });
  });

  // ── Error handling ────────────────────────────────────────────
  it('TC-ORD-12: DB lỗi bất kỳ → ROLLBACK được gọi và lỗi được re-throw', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockRejectedValueOnce(new Error('Connection reset'));
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 1))
      .rejects.toThrow('Connection reset');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('TC-ORD-13: Socket emit lỗi không ảnh hưởng đến response thành công', async () => {
    mockActiveSession();
    mockAvailableItem();
    mockOrderInsert();
    mockClient.query.mockResolvedValueOnce({}); // UPDATE version
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    // Pool query để emit socket throw error
    mockPool.query.mockRejectedValueOnce(new Error('Socket DB error'));

    // Vẫn trả về kết quả thành công vì lỗi socket được catch trong try-catch riêng
    const result = await orderService.createOrder('sess_1', [{ menu_item_id: 1, quantity: 1 }], 1);
    expect(result.order_id).toBe('order_1');
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 2: getSessionOrders() — Lấy danh sách đơn hàng
// ─────────────────────────────────────────────────────────────
describe('Order Service — getSessionOrders()', () => {

  it('TC-GET-ORD-01: Session có 2 orders → trả về đầy đủ items và options', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'SERVING', created_at: new Date(), version: 1 }, { id: 2, status: 'PENDING', created_at: new Date(), version: 1 }] }) // orders
      .mockResolvedValueOnce({ rows: [
        { id: 10, order_id: 1, menu_item_id: 1, name: 'Sườn', image_url: null, quantity: 2, unit_price: 80000, status: 'READY' },
        { id: 11, order_id: 2, menu_item_id: 2, name: 'Nước cam', image_url: null, quantity: 1, unit_price: 30000, status: 'PENDING' },
      ]}) // order_items
      .mockResolvedValueOnce({ rows: [
        { id: 100, order_item_id: 10, menu_item_option_id: 1, option_name: 'Không cay', option_group: 'Độ cay' },
      ]}); // order_item_options

    const result = await orderService.getSessionOrders('sess_1');

    expect(result).toHaveLength(2);
    expect(result[0].items[0].options).toHaveLength(1);
    expect(result[0].items[0].options[0].option_name).toBe('Không cay');
    expect(result[1].items[0].name).toBe('Nước cam');
  });

  it('TC-GET-ORD-02: Session chưa có order nào → trả về mảng rỗng', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await orderService.getSessionOrders('sess_empty');
    expect(result).toEqual([]);
  });

  it('TC-GET-ORD-03: Order có items nhưng item không có options → options = []', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING', created_at: new Date(), version: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10, order_id: 1, name: 'Salad', quantity: 1, status: 'PENDING' }] })
      .mockResolvedValueOnce({ rows: [] }); // no options

    const result = await orderService.getSessionOrders('sess_1');

    expect(result[0].items[0].options).toEqual([]);
  });

  it('TC-GET-ORD-04: Order tồn tại nhưng không có items → items = []', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'PENDING', created_at: new Date(), version: 1 }] })
      .mockResolvedValueOnce({ rows: [] }); // no items

    const result = await orderService.getSessionOrders('sess_1');

    expect(result[0].items).toEqual([]);
  });
});
