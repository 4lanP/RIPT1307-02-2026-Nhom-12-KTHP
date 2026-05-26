require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
require('./helpers/mockSocket');
const { mockEmit, mockTo, mockOf } = require('./helpers/mockSocket');
const sessionService = require('../src/services/session.service');

describe('Socket.IO Payment Notifications', () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockTo.mockClear();
    mockOf.mockClear();
  });

  it('emits bank_transfer_requested to /staff when customer requests transfer', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 12, table_id: 3, table_name: 'Bàn 03', final_amount: '150000.00', status: 'ACTIVE' }],
    });
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // Payment check
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // Payment insert
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    await sessionService.requestBankTransfer(12);

    expect(mockOf).toHaveBeenCalledWith('/staff');
    expect(mockEmit).toHaveBeenCalledWith('bank_transfer_requested', expect.objectContaining({
      session_id: 12,
      table_id: 3,
      table_name: 'Bàn 03',
      amount: 150000
    }));
  });

  it('emits session_closed to /customer and table_status_changed to /staff on confirmation', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ table_id: 3, status: 'ACTIVE', final_amount: '150000.00' }],
    });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE PAYMENTS
    mockClient.query.mockResolvedValueOnce({}); // UPDATE SESSIONS
    mockClient.query.mockResolvedValueOnce({}); // UPDATE TABLES
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    await sessionService.confirmBankTransfer(12);

    // Verify staff namespace was notified
    expect(mockOf).toHaveBeenCalledWith('/staff');
    expect(mockEmit).toHaveBeenCalledWith('table_status_changed', { table_id: 3, status: 'AVAILABLE' });

    // Verify customer room was notified
    expect(mockOf).toHaveBeenCalledWith('/customer');
    expect(mockTo).toHaveBeenCalledWith(12);
    expect(mockEmit).toHaveBeenCalledWith('session_closed', { reason: 'PAID' });
  });
});
