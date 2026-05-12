require('./helpers/mockDb');
const { mockClient, mockPool } = require('./helpers/mockDb');
const { mockOf, mockTo, mockEmit } = require('./helpers/mockSocket');
const orderService = require('../src/services/order.service');
const sessionService = require('../src/services/session.service');

// Giả lập calculateSessionBill để tránh query DB thật
jest.spyOn(sessionService, 'calculateSessionBill').mockResolvedValue();

describe('Order Service', () => {
  describe('createOrder()', () => {
    it('thành công trả về order_id và emit socket', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      // SELECT FOR UPDATE sessions
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', table_id: 1, status: 'ACTIVE' }] });
      // SELECT MENU_ITEMS FOR UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bò', price: 100, is_available: true, daily_quota: 10 }] });
      // UPDATE MENU_ITEMS with constraint check - now returns rows
      mockClient.query.mockResolvedValueOnce({ rows: [{ daily_quota: 9 }] });
      // INSERT ORDERS
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'order_1' }] });
      // INSERT ORDER_ITEMS
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_1' }] });
      // SELECT extra_price options
      mockClient.query.mockResolvedValueOnce({ rows: [{ extra_price: 10 }] });
      // INSERT ORDER_ITEM_OPTIONS
      mockClient.query.mockResolvedValueOnce({});

      // calculateSessionBill
      mockClient.query.mockResolvedValueOnce({ rows: [{ subtotal: '100' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ discount_amount: '0' }] });
      mockClient.query.mockResolvedValueOnce({});

      // UPDATE SESSIONS version
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      // Lấy group items emit
      mockPool.query.mockResolvedValueOnce({
        rows: [{ station: 'GRILL', station_items: [{ name: 'Bò' }] }]
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ name: 'Bàn 1' }] }); // table name

      const items = [{ menu_item_id: 1, quantity: 1, options: [{ option_id: 1 }] }];
      const result = await orderService.createOrder('sess_1', items, 1);

      expect(result.order_id).toBe('order_1');
      expect(mockOf).toHaveBeenCalledWith('/kitchen');
      expect(mockTo).toHaveBeenCalledWith('GRILL');
      expect(mockEmit).toHaveBeenCalledWith('new_order', expect.any(Object));
    });

    it('session version mismatch ném lỗi 409', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT session -> empty
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(orderService.createOrder('sess_1', [], 2))
        .rejects.toMatchObject({ statusCode: 409, message: expect.any(String) });
    });

    it('session đã CLOSED ném lỗi 403', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', status: 'CLOSED' }] });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(orderService.createOrder('sess_1', [], 1))
        .rejects.toMatchObject({ statusCode: 403, message: 'Session này đã bị đóng.' });
    });

    it('món hết quota ném lỗi 400', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', status: 'ACTIVE' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bò', is_available: true, daily_quota: 0 }] }); // quota 0
      // UPDATE with constraint returns empty rows
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      const items = [{ menu_item_id: 1, quantity: 1 }];
      await expect(orderService.createOrder('sess_1', items, 1))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('không đủ số lượng') });
    });

    it('món is_available=false ném lỗi 400', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', status: 'ACTIVE' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bò', is_available: false, daily_quota: 10 }] }); // not available
      // is_available check throws before UPDATE, so no UPDATE mock needed
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      const items = [{ menu_item_id: 1, quantity: 1 }];
      await expect(orderService.createOrder('sess_1', items, 1))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('hiện không phục vụ') });
    });

    it('option không thuộc món ném lỗi 400', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'sess_1', table_id: 1, status: 'ACTIVE' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Bò', price: 100, is_available: true, daily_quota: 10 }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ daily_quota: 9 }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'order_1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item_1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT option scoped by menu item
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      const items = [{ menu_item_id: 1, quantity: 1, options: [{ option_id: 99 }] }];
      await expect(orderService.createOrder('sess_1', items, 1))
        .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Invalid option') });
    });

    it('DB lỗi giữa chừng gọi ROLLBACK', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('DB Error')); // Lỗi khi select session
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(orderService.createOrder('sess_1', [], 1)).rejects.toThrow('DB Error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('calculateSessionBill()', () => {
    it('Tính đúng subtotal', async () => {
      // Temporarily restore spy to test actual function
      const spy = jest.spyOn(sessionService, 'calculateSessionBill');
      spy.mockRestore();

      mockClient.query.mockResolvedValueOnce({ rows: [{ subtotal: '100' }] }); // Bill query
      mockClient.query.mockResolvedValueOnce({ rows: [{ discount_amount: '10' }] }); // Session discount
      mockClient.query.mockResolvedValueOnce({}); // Update query

      await sessionService.calculateSessionBill('sess_1', mockClient);

      // (100 - 10) * 0.08 = 7.2 tax
      // final = 100 - 10 + 7.2 = 97.2
      expect(mockClient.query).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE sessions SET subtotal=$1, tax_amount=$2, final_amount=$3'),
        [100, 7.2, 97.2, 'sess_1']
      );

      // Restore spy for other tests
      spy.mockResolvedValue();
    });
  });
});
