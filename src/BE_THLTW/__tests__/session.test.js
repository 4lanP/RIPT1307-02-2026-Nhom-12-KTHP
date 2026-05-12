require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
require('./helpers/mockSocket');
const sessionService = require('../src/services/session.service');

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_32_chars_minimum';

describe('Session Service', () => {
  describe('checkoutCash()', () => {
    it('rejects payment amount below final_amount', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ table_id: 1, status: 'ACTIVE', final_amount: '100.00' }],
      });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(sessionService.checkoutCash(1, -1))
        .rejects.toMatchObject({ statusCode: 409, message: 'Invalid payment amount' });

      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO PAYMENTS'),
        expect.any(Array)
      );
    });

    it('rejects checkout for a closed session', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ table_id: 1, status: 'CLOSED', final_amount: '0.00' }],
      });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(sessionService.checkoutCash(1, 0))
        .rejects.toMatchObject({ statusCode: 409, message: 'Session is already closed' });
    });
  });

  describe('scan()', () => {
    it('locks table row while opening a session', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, table_id: 1 }] }); // QR
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'AVAILABLE', name: 'Table 1' }] }); // table
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10 }] }); // session insert
      mockClient.query.mockResolvedValueOnce({}); // update table
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      await sessionService.scan('QR-1');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM TABLES WHERE id = $1 FOR UPDATE',
        [1]
      );
    });
  });
});
