require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
const { mockOf, mockTo, mockEmit } = require('./helpers/mockSocket');
const kdsService = require('../src/services/kds.service');

describe('KDS Service', () => {
  describe('updateOrderItemStatus()', () => {
    it('cập nhật item PREPARING -> READY, ORDER giữ nguyên nếu còn PREPARING', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 'order_1', status: 'READY' }] }); // UPDATE order item
      // Các item khác còn PREPARING
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }, { status: 'PREPARING' }] });
      // Lấy order cũ
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] });
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');
      
      expect(result.order_status).toBe('PREPARING'); // Giữ nguyên
    });

    it('TẤT CẢ items = READY -> ORDER tự chuyển READY', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 'order_1', status: 'READY' }] }); 
      // Tất cả đều READY
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }, { status: 'READY' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] });
      // Update order status
      mockClient.query.mockResolvedValueOnce({});
      // Insert log
      mockClient.query.mockResolvedValueOnce({});
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');
      
      expect(result.order_status).toBe('READY');
      expect(mockOf).toHaveBeenCalledWith('/customer');
      expect(mockTo).toHaveBeenCalledWith('sess_1');
      expect(mockEmit).toHaveBeenCalledWith('order_status_updated', expect.any(Object));
    });

    it('items bị CANCELLED không tính vào -> ORDER vẫn READY', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ order_id: 'order_1', status: 'READY' }] }); 
      // Query get items status TRỪ CANCELLED (trong service trả về READY)
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'READY' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ status: 'PREPARING', session_id: 'sess_1' }] });
      // Update order status
      mockClient.query.mockResolvedValueOnce({});
      mockClient.query.mockResolvedValueOnce({}); // Insert log
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await kdsService.updateOrderItemStatus('item_1', 'READY', 'user_1');
      
      expect(result.order_status).toBe('READY');
    });
  });
});
