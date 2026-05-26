require('./helpers/mockDb');

const { mockClient, mockPool } = require('./helpers/mockDb');
const invoiceService = require('../src/services/invoice.service');

const staffUser = { id: 7, full_name: 'Nguyễn Admin', role: 'ADMIN' };

function mockCreateInvoiceBase() {
  mockClient.query.mockResolvedValueOnce({}); // BEGIN
  mockClient.query.mockResolvedValueOnce({
    rows: [{
      id: 55,
      table_id: 3,
      table_name: 'Bàn 03',
      subtotal: '240000.00',
      discount_amount: '0.00',
      tax_amount: '19200.00',
      final_amount: '259200.00',
      status: 'ACTIVE',
    }],
  });
  mockClient.query.mockResolvedValueOnce({
    rows: [{
      order_item_id: 11,
      item_name: 'Bia Tiger',
      quantity: 2,
      unit_price: '30000.00',
      options_total: '0.00',
      line_total: '60000.00',
      note: '',
    }],
  });
  mockClient.query.mockResolvedValueOnce({ rows: [] }); // payments
}

describe('invoice service', () => {
  describe('createInvoice()', () => {
    it('creates an invoice snapshot with line items and does not close the session', async () => {
      mockCreateInvoiceBase();
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // duplicate lookup
      mockClient.query.mockResolvedValueOnce({}); // supersede previous
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 101,
          invoice_number: 'INV-20260526-0001',
          session_id: 55,
          table_id: 3,
          table_name: 'Bàn 03',
          status: 'ISSUED',
          payment_status: 'UNPAID',
          payment_method: null,
          subtotal: '240000.00',
          discount_amount: '0.00',
          tax_amount: '19200.00',
          rounding_amount: '0.00',
          final_amount: '259200.00',
          created_by_name: 'Nguyễn Admin',
          created_at: '2026-05-26T10:00:00.000Z',
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          item_name: 'Bia Tiger',
          quantity: 2,
          unit_price: '30000.00',
          options_total: '0.00',
          line_total: '60000.00',
          note: '',
        }],
      });
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await invoiceService.createInvoice(55, staffUser);

      expect(result.invoice).toEqual(expect.objectContaining({
        id: 101,
        invoice_number: 'INV-20260526-0001',
        payment_status: 'UNPAID',
        final_amount: 259200,
      }));
      expect(result.items).toEqual([
        expect.objectContaining({
          item_name: 'Bia Tiger',
          quantity: 2,
          line_total: 60000,
        }),
      ]);
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE SESSIONS SET status'),
        expect.any(Array)
      );
    });

    it('returns existing invoice when the bill fingerprint has not changed', async () => {
      mockCreateInvoiceBase();
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 101, invoice_number: 'INV-20260526-0001', final_amount: '259200.00' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 101, invoice_number: 'INV-20260526-0001', final_amount: '259200.00' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ item_name: 'Bia Tiger', quantity: 2, unit_price: '30000.00', options_total: '0.00', line_total: '60000.00' }],
      });
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await invoiceService.createInvoice(55, staffUser);

      expect(result.invoice.invoice_number).toBe('INV-20260526-0001');
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO INVOICES'),
        expect.any(Array)
      );
    });

    it('rejects invoice creation when the session has no served items', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 55, table_id: 3, table_name: 'Bàn 03' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(invoiceService.createInvoice(55, staffUser))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects invoice creation for a missing session', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(invoiceService.createInvoice(999, staffUser))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  it('lists session invoices for history and reprint review', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 101, invoice_number: 'INV-1', session_id: 55, table_name: 'Bàn 03', final_amount: '100000.00' }],
    });

    const result = await invoiceService.listSessionInvoices(55);

    expect(result).toEqual([
      expect.objectContaining({ id: 101, invoice_number: 'INV-1', final_amount: 100000 }),
    ]);
  });

  it('records print and reprint events without mutating invoice totals', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 101 }] });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ invoice_id: 101, print_type: 'REPRINT', printed_at: '2026-05-26T10:02:00.000Z' }],
    });

    const result = await invoiceService.recordPrintEvent(101, staffUser, 'REPRINT');

    expect(result).toEqual(expect.objectContaining({ invoice_id: 101, print_type: 'REPRINT' }));
    expect(mockPool.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE INVOICES SET final_amount'),
      expect.any(Array)
    );
  });
});
