require('./helpers/mockDb');
require('./helpers/mockSocket');

const { mockPool, mockClient } = require('./helpers/mockDb');
const { mockEmit, mockOf, mockTo } = require('./helpers/mockSocket');

jest.mock('../src/utils/jwt.util', () => ({
  generateSessionToken: jest.fn().mockReturnValue('mocked-token')
}));

jest.mock('../src/services/order.service', () => ({
  getSessionOrders: jest.fn().mockResolvedValue([])
}));

const sessionService = require('../src/services/session.service');
const { NotFoundError, ConflictError } = require('../src/utils/errors');

describe('Session Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scan', () => {
    it('should throw NotFoundError if QR is invalid', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // QR not found
      
      await expect(sessionService.scan('invalid-qr')).rejects.toThrow(NotFoundError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw ConflictError if table is occupied', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, table_id: 1 }] }) // QR found
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'OCCUPIED' }] }); // Table occupied
      
      await expect(sessionService.scan('valid-qr')).rejects.toThrow(ConflictError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should create session and return token if QR and table are valid', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, table_id: 1 }] }) // QR found
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Table 1', status: 'AVAILABLE' }] }) // Table available
        .mockResolvedValueOnce({ rows: [{ id: 100 }] }) // Insert session returning id
        .mockResolvedValueOnce() // Update table status
        .mockResolvedValueOnce(); // COMMIT

      const result = await sessionService.scan('valid-qr');
      
      expect(result).toEqual({ session_token: 'mocked-token', table_name: 'Table 1' });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockOf).toHaveBeenCalledWith('/staff');
      expect(mockEmit).toHaveBeenCalledWith('table_status_changed', { table_id: 1, status: 'OCCUPIED' });
    });
  });

  describe('getSession', () => {
    it('should throw NotFoundError if session not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(sessionService.getSession(999)).rejects.toThrow(NotFoundError);
    });

    it('should return session if found', async () => {
      const mockSession = { id: 1, status: 'ACTIVE', table_name: 'T1' };
      mockPool.query.mockResolvedValueOnce({ rows: [mockSession] });
      
      const result = await sessionService.getSession(1);
      expect(result).toEqual(mockSession);
    });
  });

  describe('checkoutCash', () => {
    it('should close session, update table status and emit events', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ table_id: 1 }] }) // Select session
        .mockResolvedValueOnce() // Insert payment
        .mockResolvedValueOnce() // Update session
        .mockResolvedValueOnce() // Update table
        .mockResolvedValueOnce(); // COMMIT

      const result = await sessionService.checkoutCash(1, 100000);
      
      expect(result).toEqual({ success: true });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockOf).toHaveBeenCalledWith('/staff');
      expect(mockEmit).toHaveBeenCalledWith('table_status_changed', { table_id: 1, status: 'AVAILABLE' });
      expect(mockTo).toHaveBeenCalledWith(1);
      expect(mockEmit).toHaveBeenCalledWith('session_closed', { reason: 'PAID' });
    });

    it('should throw NotFoundError if session does not exist', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Select session (not found)

      await expect(sessionService.checkoutCash(999, 100000)).rejects.toThrow(NotFoundError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTables', () => {
    it('should return tables list', async () => {
      const mockTables = [{ table_id: 1, table_name: 'Table 1', status: 'AVAILABLE' }];
      mockPool.query.mockResolvedValueOnce({ rows: mockTables });
      
      const result = await sessionService.getTables();
      expect(result).toEqual(mockTables);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('forceCloseSession', () => {
    it('should force close a session', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ table_id: 1 }] }) // Select session
        .mockResolvedValueOnce() // Update session
        .mockResolvedValueOnce() // Update table
        .mockResolvedValueOnce(); // COMMIT

      const result = await sessionService.forceCloseSession(1);
      
      expect(result).toEqual({ success: true });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockOf).toHaveBeenCalledWith('/staff');
      expect(mockEmit).toHaveBeenCalledWith('table_status_changed', { table_id: 1, status: 'AVAILABLE' });
      expect(mockTo).toHaveBeenCalledWith(1);
      expect(mockEmit).toHaveBeenCalledWith('session_closed', { reason: 'FORCE_CLOSED' });
    });

    it('should throw NotFoundError if session not found', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Select session (not found)

      await expect(sessionService.forceCloseSession(999)).rejects.toThrow(NotFoundError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
