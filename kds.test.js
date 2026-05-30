/**
 * TEST SUITE: KDS Service
 * Covers: getOrdersByStation(), updateOrderItemStatus()
 *
 * Module được test: src/services/kds.service.js
 */

require('./helpers/mockDb');
const { mockClient, mockPool } = require('./helpers/mockDb');
const { mockOf, mockTo, mockEmit } = require('./helpers/mockSocket');
const kdsService = require('../src/services/kds.service');

// ─────────────────────────────────────────────────────────────
// NHÓM 1: getOrdersByStation() — Lấy hàng đợi theo trạm bếp
// ─────────────────────────────────────────────────────────────
describe('KDS Service — getOrdersByStation()', () => {

  it('TC-KDS-01: Station GRILL có orders → trả về danh sách grouped theo order_id', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          order_id: 1,
          table_name: 'Bàn 01',
          created_at: new Date(),
          items: [{ id: 10, name: 'Sườn nướng', quantity: 2, note: 'Không cay', status: 'PENDING' }],
        },
        {
          order_id: 2,
          table_name: 'Bàn 03',
          created_at: new Date(),
          items: [{ id: 11, name: 'Bò nướng', quantity: 1, note: null, status: 'PREPARING' }],
        },
      ],
    });

    const result = await kdsService.getOrdersByStation('GRILL');

    expect(result).toHaveLength(2);
    expect(result[0].table_name).toBe('Bàn 01');
    expect(result[0].items[0].status).toBe('PENDING');
    expect(result[1].items[0].name).toBe('Bò nướng');
  });

  it('TC-KDS-02: Station BAR có orders → trả về đúng data', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ order_id: 5, table_name: 'Bàn 05', created_at: new Date(), items: [{ id: 20, name: 'Cocktail', quantity: 2, status: 'PENDING' }] }],
    });

    const result = await kdsService.getOrdersByStation('BAR');

    expect(result[0].items[0].name).toBe('Cocktail');
  });

  it('TC-KDS-03: Station không có order nào đang chờ → trả về mảng rỗng', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await kdsService.getOrdersByStation('COLD');

    expect(result).toEqual([]);
  });

  it('TC-KDS-04: Chỉ lấy order item có status PENDING hoặc PREPARING (không lấy READY, SERVED, CANCELLED)', async () => {
    // Kiểm tra SQL query được gọi đúng
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await kdsService.getOrdersByStation('GRILL');

    const queryCall = mockPool.query.mock.calls[0][0];
    expect(queryCall).toContain("status IN ('PENDING', 'PREPARING')");
  });

  it('TC-KDS-05: Items được sắp xếp theo thời gian tạo tăng dần (FIFO)', async () => {
    const earlier = new Date('2024-01-01T10:00:00');
    const later = new Date('2024-01-01T11:00:00');

    mockPool.query.mockResolvedValueOnce({
      rows: [
        { order_id: 1, table_name: 'Bàn 01', created_at: earlier, items: [] },
        { order_id: 2, table_name: 'Bàn 02', created_at: later, items: [] },
      ],
    });

    const result = await kdsService.getOrdersByStation('GRILL');

    expect(result[0].order_id).toBe(1); // Order cũ hơn phải lên trước
    expect(result[1].order_id).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 2: updateOrderItemStatus() — Cập nhật trạng thái item
// ─────────────────────────────────────────────────────────────
describe('KDS Service — updateOrderItemStatus()', () => {

  // ── Trạng thái ORDER tự động tính lại ─────────────────────────
  it('TC-KDS-06: Cập nhật 1 item → READY, còn item khác PREPARING → ORDER giữ nguyên PREPARING', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'READY' }] }); // UPDATE item
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }, { status: 'PREPARING' }] }); // items status
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] }); // ORDER
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');

    expect(result.order_status).toBe('PREPARING');
    // Không emit socket vì ORDER status không thay đổi
    expect(mockEmit).not.toHaveBeenCalledWith('order_status_updated', expect.anything());
  });

  it('TC-KDS-07: Tất cả items = READY → ORDER tự chuyển thành READY và emit socket /customer', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'READY' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }, { status: 'READY' }] }); // all READY
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] }); // old ORDER PREPARING
    mockClient.query.mockResolvedValueOnce({}); // UPDATE ORDER status
    mockClient.query.mockResolvedValueOnce({}); // INSERT ORDER_STATUS_LOG
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');

    expect(result.order_status).toBe('READY');
    expect(mockOf).toHaveBeenCalledWith('/customer');
    expect(mockTo).toHaveBeenCalledWith('sess_1');
    expect(mockEmit).toHaveBeenCalledWith('order_status_updated', expect.objectContaining({ order_id: 1, new_status: 'READY' }));
  });

  it('TC-KDS-08: Tất cả items = SERVED → ORDER tự chuyển SERVED', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'SERVED' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'SERVED' }, { status: 'SERVED' }] }); // all SERVED
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY', session_id: 'sess_1' }] });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE ORDER
    mockClient.query.mockResolvedValueOnce({}); // INSERT LOG
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await kdsService.updateOrderItemStatus('item_1', 'SERVED', 'user_1');

    expect(result.order_status).toBe('SERVED');
  });

  it('TC-KDS-09: Items CANCELLED không tính vào khi xác định ORDER status', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'READY' }] });
    // Query TRỪ CANCELLED trả về chỉ 1 item READY (item kia đã CANCELLED)
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE ORDER
    mockClient.query.mockResolvedValueOnce({}); // INSERT LOG
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');

    expect(result.order_status).toBe('READY'); // Tính READY dù item kia bị CANCELLED
  });

  it('TC-KDS-10: Cập nhật PENDING → PREPARING → ORDER chuyển PREPARING, không emit', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'PREPARING' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING' }, { status: 'PENDING' }] }); // mixed
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PENDING', session_id: 'sess_1' }] }); // old PENDING
    mockClient.query.mockResolvedValueOnce({}); // UPDATE ORDER
    mockClient.query.mockResolvedValueOnce({}); // INSERT LOG
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await kdsService.updateOrderItemStatus('item_2', 'PREPARING', 'kitchen_user');

    expect(result.order_status).toBe('PREPARING');
  });

  it('TC-KDS-11: order_item_id không tồn tại → ném NotFoundError (404)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(kdsService.updateOrderItemStatus(9999, 'READY', 'user_1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Order item không tồn tại' });
  });

  it('TC-KDS-12: ORDER status thay đổi → ORDER_STATUS_LOG được ghi', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'READY' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE ORDER
    mockClient.query.mockResolvedValueOnce({}); // INSERT LOG
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_kitchen');

    const logCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO ORDER_STATUS_LOGS')
    );
    expect(logCall).toBeDefined();
    expect(logCall[1]).toEqual(expect.arrayContaining([1, 'user_kitchen', 'PREPARING', 'READY']));
  });

  it('TC-KDS-13: ORDER status không thay đổi → không INSERT log, không emit socket', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 1, status: 'READY' }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }, { status: 'PREPARING' }] }); // mixed → PREPARING
    mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] }); // đã là PREPARING
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');

    const logCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO ORDER_STATUS_LOGS')
    );
    expect(logCall).toBeUndefined();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('TC-KDS-14: DB lỗi khi cập nhật → ROLLBACK được gọi', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockRejectedValueOnce(new Error('Deadlock detected'));
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1'))
      .rejects.toThrow('Deadlock detected');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
