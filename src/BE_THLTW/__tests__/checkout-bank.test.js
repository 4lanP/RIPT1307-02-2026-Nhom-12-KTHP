require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
require('./helpers/mockSocket');
const { mockEmit, mockTo, mockOf } = require('./helpers/mockSocket');
const sessionService = require('../src/services/session.service');

describe('Bank Checkout Integration Tests', () => {
  describe('requestBankTransfer()', () => {
    it('successfully requests bank transfer and inserts a pending payment', async () => {
      // Mock active session retrieval
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 10, table_id: 3, table_name: 'Bàn 03', final_amount: '250000.00', status: 'ACTIVE' }],
      });
      // Mock payment check returning no existing payment
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // Mock payment insertion
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await sessionService.requestBankTransfer(10);
      expect(result).toEqual({ success: true });

      // Check payment insert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PAYMENTS'),
        expect.arrayContaining([10, '250000.00'])
      );

      // Check Socket IO notification
      expect(mockOf).toHaveBeenCalledWith('/staff');
      expect(mockEmit).toHaveBeenCalledWith('bank_transfer_requested', expect.objectContaining({
        session_id: 10,
        table_id: 3,
        table_name: 'Bàn 03',
        amount: 250000
      }));
    });

    it('does not insert duplicate payment but still notifies staff if already pending', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 10, table_id: 3, table_name: 'Bàn 03', final_amount: '250000.00', status: 'ACTIVE' }],
      });
      // Mock payment check returning an existing pending payment
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await sessionService.requestBankTransfer(10);
      expect(result).toEqual({ success: true });

      // Should NOT insert
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PAYMENTS'),
        expect.any(Array)
      );

      // Should still emit socket event
      expect(mockEmit).toHaveBeenCalledWith('bank_transfer_requested', expect.objectContaining({
        session_id: 10,
        amount: 250000
      }));
    });

    it('rejects if session is not active or missing', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Session not found
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(sessionService.requestBankTransfer(999))
        .rejects.toThrow('Session không tồn tại hoặc đã đóng');
    });
  });

  describe('confirmBankTransfer()', () => {
    it('successfully confirms payment, closes session and frees table', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ table_id: 3, status: 'ACTIVE', final_amount: '250000.00' }],
      });
      mockClient.query.mockResolvedValueOnce({}); // UPDATE PAYMENTS
      mockClient.query.mockResolvedValueOnce({}); // UPDATE SESSIONS
      mockClient.query.mockResolvedValueOnce({}); // UPDATE TABLES
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await sessionService.confirmBankTransfer(10);
      expect(result).toEqual({ success: true });

      // Verify updates
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE PAYMENTS SET status = 'COMPLETED'"),
        expect.arrayContaining([10])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE SESSIONS SET status = 'CLOSED'"),
        expect.arrayContaining([10])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE TABLES SET status = 'AVAILABLE'"),
        expect.arrayContaining([3])
      );

      // Verify Socket emissions
      expect(mockEmit).toHaveBeenCalledWith('table_status_changed', { table_id: 3, status: 'AVAILABLE' });
      expect(mockTo).toHaveBeenCalledWith(10);
      expect(mockEmit).toHaveBeenCalledWith('session_closed', { reason: 'PAID' });
    });

    it('fails if session is already closed', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ table_id: 3, status: 'CLOSED', final_amount: '250000.00' }],
      });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(sessionService.confirmBankTransfer(10))
        .rejects.toThrow('Session is already closed');
    });
  });
});
