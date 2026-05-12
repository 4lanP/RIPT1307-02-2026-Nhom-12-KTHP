require('./helpers/mockDb');
require('./helpers/mockSocket');

const { mockPool, mockClient } = require('./helpers/mockDb');
const { mockEmit, mockOf, mockTo } = require('./helpers/mockSocket');

jest.mock('../src/utils/vnpay.util', () => ({
  createPaymentUrl: jest.fn().mockReturnValue('mocked-url'),
  verifyIPN: jest.fn()
}));

jest.mock('../src/config/redis', () => ({
  acquireLock: jest.fn(),
  releaseLock: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

const paymentService = require('../src/services/payment.service');
const { NotFoundError } = require('../src/utils/errors');
const vnpayUtil = require('../src/utils/vnpay.util');
const redisUtil = require('../src/config/redis');

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVNPayPayment', () => {
    it('should throw NotFoundError if session not found', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Session not found

      await expect(paymentService.createVNPayPayment(1, '127.0.0.1')).rejects.toThrow(NotFoundError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should create payment and return url', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ final_amount: 100000 }] }) // Session found
        .mockResolvedValueOnce() // Insert payment
        .mockResolvedValueOnce(); // COMMIT

      const result = await paymentService.createVNPayPayment(1, '127.0.0.1');
      expect(result).toEqual({ payment_url: 'mocked-url' });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('processVNPayWebhook', () => {
    const mockQueryData = { vnp_TxnRef: 'txn-1', vnp_ResponseCode: '00' };

    it('should return Invalid Checksum if verifyIPN is false', async () => {
      vnpayUtil.verifyIPN.mockReturnValue(false);
      const result = await paymentService.processVNPayWebhook(mockQueryData);
      expect(result).toEqual({ RspCode: '97', Message: 'Invalid Checksum' });
    });

    it('should return Already Processing if lock not acquired', async () => {
      vnpayUtil.verifyIPN.mockReturnValue(true);
      redisUtil.acquireLock.mockResolvedValue(false);
      const result = await paymentService.processVNPayWebhook(mockQueryData);
      expect(result).toEqual({ RspCode: '02', Message: 'Webhook already processing' });
    });

    it('should return Order not found if payment not in DB', async () => {
      vnpayUtil.verifyIPN.mockReturnValue(true);
      redisUtil.acquireLock.mockResolvedValue(true);
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Payment not found
        .mockResolvedValueOnce(); // ROLLBACK

      const result = await paymentService.processVNPayWebhook(mockQueryData);
      expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return Order already confirmed if payment is completed', async () => {
      vnpayUtil.verifyIPN.mockReturnValue(true);
      redisUtil.acquireLock.mockResolvedValue(true);
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'COMPLETED' }] }) // Payment found
        .mockResolvedValueOnce(); // ROLLBACK

      const result = await paymentService.processVNPayWebhook(mockQueryData);
      expect(result).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
    });

    it('should process successful payment', async () => {
      vnpayUtil.verifyIPN.mockReturnValue(true);
      redisUtil.acquireLock.mockResolvedValue(true);
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'PENDING', session_id: 1 }] }) // Payment found
        .mockResolvedValueOnce() // Update PAYMENT
        .mockResolvedValueOnce({ rows: [{ table_id: 10 }] }) // Update SESSION returning table_id
        .mockResolvedValueOnce() // Update TABLE
        .mockResolvedValueOnce(); // COMMIT

      const result = await paymentService.processVNPayWebhook(mockQueryData);
      
      expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockOf).toHaveBeenCalledWith('/staff');
      expect(mockEmit).toHaveBeenCalledWith('table_status_changed', { table_id: 10, status: 'AVAILABLE' });
    });

    it('should process failed payment', async () => {
      vnpayUtil.verifyIPN.mockReturnValue(true);
      redisUtil.acquireLock.mockResolvedValue(true);
      
      const failQueryData = { ...mockQueryData, vnp_ResponseCode: '24' }; // 24 = cancelled
      
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'PENDING', session_id: 1 }] }) // Payment found
        .mockResolvedValueOnce() // Update PAYMENT to FAILED
        .mockResolvedValueOnce(); // COMMIT

      const result = await paymentService.processVNPayWebhook(failQueryData);
      
      expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
