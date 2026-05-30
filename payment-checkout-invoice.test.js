/**
 * TEST SUITE: VNPay Webhook + Staff Checkout + Invoice
 * Covers:
 *   - VNPay IPN callback (idempotency, signature verify)
 *   - Staff checkout (cash & bank transfer)
 *   - Invoice generation & reprint
 *
 * Modules: src/services/payment.service.js (VNPay)
 *          src/services/staff.service.js   (checkout)
 *          src/services/invoice.service.js
 */

require('./helpers/mockDb');
const { mockClient, mockPool } = require('./helpers/mockDb');
const { mockOf, mockTo, mockEmit } = require('./helpers/mockSocket');

// ─────────────────────────────────────────────────────────────
// NHÓM 1: VNPay Webhook — Idempotency & Security
// ─────────────────────────────────────────────────────────────
describe('VNPay Webhook — Idempotency & Signature', () => {

  let paymentService;

  beforeEach(() => {
    jest.resetModules();
    paymentService = require('../src/services/payment.service');
  });

  it('TC-VNPAY-01: IPN callback hợp lệ với ResponseCode 00 → payment COMPLETED, session CLOSED', async () => {
    const vnpayParams = {
      vnp_TxnRef: 'TXN-001',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_Amount: '25000000', // 250000 VND (x100)
      vnp_TransactionNo: 'VNP-999',
      vnp_SecureHash: 'valid-hash',
    };

    jest.spyOn(paymentService, 'verifyVNPaySignature').mockReturnValue(true);
    jest.spyOn(paymentService, 'getRedisLock').mockResolvedValue(true); // lock thành công

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, session_id: 42, status: 'PENDING', amount: 250000 }],
    }); // SELECT PAYMENTS
    mockClient.query.mockResolvedValueOnce({}); // UPDATE payment COMPLETED
    mockClient.query.mockResolvedValueOnce({}); // UPDATE session CLOSED
    mockClient.query.mockResolvedValueOnce({}); // UPDATE table AVAILABLE
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    mockOf.mockReturnValue({ to: mockTo, emit: mockEmit });
    mockTo.mockReturnValue({ emit: mockEmit });

    const result = await paymentService.handleVNPayIPN(vnpayParams);

    expect(result.RspCode).toBe('00');
  });

  it('TC-VNPAY-02: Signature không hợp lệ → trả RspCode 97, không xử lý', async () => {
    jest.spyOn(paymentService, 'verifyVNPaySignature').mockReturnValue(false);

    const result = await paymentService.handleVNPayIPN({ vnp_SecureHash: 'invalid' });

    expect(result.RspCode).toBe('97');
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('TC-VNPAY-03: IPN được gọi 2 lần cùng transaction (idempotency) → lần 2 trả RspCode 02', async () => {
    jest.spyOn(paymentService, 'verifyVNPaySignature').mockReturnValue(true);
    // Redis lock lần 2 không thành công (lock đã tồn tại)
    jest.spyOn(paymentService, 'getRedisLock').mockResolvedValue(false);

    const result = await paymentService.handleVNPayIPN({ vnp_TxnRef: 'TXN-001', vnp_SecureHash: 'valid' });

    expect(result.RspCode).toBe('02'); // Duplicate
  });

  it('TC-VNPAY-04: ResponseCode khác 00 (thanh toán thất bại) → payment FAILED, session không đóng', async () => {
    jest.spyOn(paymentService, 'verifyVNPaySignature').mockReturnValue(true);
    jest.spyOn(paymentService, 'getRedisLock').mockResolvedValue(true);

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, session_id: 42, status: 'PENDING', amount: 250000 }],
    });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE payment FAILED
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await paymentService.handleVNPayIPN({
      vnp_TxnRef: 'TXN-002',
      vnp_ResponseCode: '24', // Cancelled by user
      vnp_SecureHash: 'valid-hash',
    });

    expect(result.RspCode).toBe('00'); // IPN nhận ok
    // Session không bị CLOSE
    const closeSessCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("UPDATE SESSIONS SET status = 'CLOSED'")
    );
    expect(closeSessCall).toBeUndefined();
  });

  it('TC-VNPAY-05: vnp_TxnRef không tìm thấy trong DB → trả RspCode 01', async () => {
    jest.spyOn(paymentService, 'verifyVNPaySignature').mockReturnValue(true);
    jest.spyOn(paymentService, 'getRedisLock').mockResolvedValue(true);

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT PAYMENTS → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    const result = await paymentService.handleVNPayIPN({
      vnp_TxnRef: 'NONEXISTENT',
      vnp_ResponseCode: '00',
      vnp_SecureHash: 'valid-hash',
    });

    expect(result.RspCode).toBe('01');
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 2: Staff Checkout — Tiền mặt & Chuyển khoản
// ─────────────────────────────────────────────────────────────
describe('Staff Service — Checkout', () => {

  let staffService;

  beforeEach(() => {
    jest.resetModules();
    staffService = require('../src/services/staff.service');
  });

  it('TC-CHKOUT-01: Checkout tiền mặt session ACTIVE → payment COMPLETED, session CLOSED', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'ACTIVE', final_amount: 250000, table_id: 1 }],
    }); // SELECT session FOR UPDATE
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // INSERT PAYMENTS
    mockClient.query.mockResolvedValueOnce({}); // UPDATE PAYMENTS COMPLETED
    mockClient.query.mockResolvedValueOnce({}); // UPDATE SESSIONS CLOSED
    mockClient.query.mockResolvedValueOnce({}); // UPDATE TABLES AVAILABLE
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    mockOf.mockReturnValue({ emit: mockEmit });

    const result = await staffService.checkoutCash(42, 'cashier_user');

    expect(result.success).toBe(true);
    expect(mockOf).toHaveBeenCalledWith('/staff');
  });

  it('TC-CHKOUT-02: Checkout session đã CLOSED → ném ConflictError (409)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'CLOSED', final_amount: 250000 }],
    });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(staffService.checkoutCash(42, 'cashier'))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('TC-CHKOUT-03: session_id không tồn tại → ném NotFoundError (404)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // session không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(staffService.checkoutCash(9999, 'cashier'))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('TC-CHKOUT-04: Sau checkout tiền mặt → bàn trở về AVAILABLE, emit table_status_changed', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'ACTIVE', final_amount: 150000, table_id: 5 }],
    });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
    mockClient.query.mockResolvedValueOnce({});
    mockClient.query.mockResolvedValueOnce({});
    mockClient.query.mockResolvedValueOnce({});
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    mockOf.mockReturnValue({ emit: mockEmit });

    await staffService.checkoutCash(42, 'cashier_user');

    const updateTableCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("UPDATE TABLES SET status = 'AVAILABLE'")
    );
    expect(updateTableCall).toBeDefined();
    expect(mockEmit).toHaveBeenCalledWith('table_status_changed', expect.objectContaining({
      table_id: 5,
      status: 'AVAILABLE',
    }));
  });

  it('TC-CHKOUT-05: Checkout Bank Transfer → payment PENDING (chờ xác nhận từ thu ngân)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'ACTIVE', final_amount: 200000, table_id: 2 }],
    });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 100 }] }); // INSERT payment PENDING
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await staffService.requestBankTransfer(42);

    // Session chưa đóng, payment status = PENDING
    const closeSessCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("UPDATE SESSIONS")
    );
    expect(closeSessCall).toBeUndefined();
  });

  it('TC-CHKOUT-06: Hủy món (cancelOrderItem) khi item PENDING → item trở thành CANCELLED', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 10, status: 'PENDING', order_id: 1, menu_item_id: 1, quantity: 2 }],
    }); // SELECT order item
    mockClient.query.mockResolvedValueOnce({}); // UPDATE ORDER_ITEMS CANCELLED
    mockClient.query.mockResolvedValueOnce({}); // UPDATE MENU_ITEMS quota (restore)
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    await staffService.cancelOrderItem(10, 'cashier_user');

    const cancelCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes("status = 'CANCELLED'")
    );
    expect(cancelCall).toBeDefined();
  });

  it('TC-CHKOUT-07: Hủy món đã SERVED → ném ValidationError (400)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 10, status: 'SERVED', order_id: 1 }],
    });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(staffService.cancelOrderItem(10, 'cashier'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('TC-CHKOUT-08: Hủy món đã READY → ném ValidationError (400)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 11, status: 'READY', order_id: 1 }],
    });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(staffService.cancelOrderItem(11, 'cashier'))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 3: Invoice — Tạo và in lại hóa đơn
// ─────────────────────────────────────────────────────────────
describe('Invoice Service — createInvoice() & reprint()', () => {

  let invoiceService;

  beforeEach(() => {
    jest.resetModules();
    invoiceService = require('../src/services/invoice.service');
  });

  it('TC-INV-01: Tạo invoice thành công sau checkout → trả về invoice_number', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'CLOSED', final_amount: 250000 }],
    }); // SELECT session
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, invoice_number: 'INV-20240101-001' }] }); // INSERT INVOICES
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await invoiceService.createInvoice(42);

    expect(result.invoice_number).toBe('INV-20240101-001');
  });

  it('TC-INV-02: Tạo invoice khi session chưa CLOSED → ném ValidationError (400)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'ACTIVE', final_amount: 250000 }],
    });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(invoiceService.createInvoice(42))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('TC-INV-03: In lại (reprint) invoice đã ISSUED → trả về invoice data', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, invoice_number: 'INV-001', status: 'ISSUED', session_id: 42, final_amount: 250000 }],
    });

    const result = await invoiceService.getInvoice(1);

    expect(result.invoice_number).toBe('INV-001');
    expect(result.status).toBe('ISSUED');
  });

  it('TC-INV-04: Invoice không tồn tại → ném NotFoundError (404)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await expect(invoiceService.getInvoice(9999))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('TC-INV-05: Invoice đã SUPERSEDED → không cho in lại, ném ValidationError (400)', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, invoice_number: 'INV-001', status: 'SUPERSEDED' }],
    });

    await expect(invoiceService.reprintInvoice(1))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
