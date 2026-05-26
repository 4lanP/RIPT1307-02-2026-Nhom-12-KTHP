import assert from 'node:assert/strict'
import {
  getInvoicePrintSections,
  getInvoicePrintTitle,
  getPaymentStatusLabel,
  normalizeInvoicePayload,
} from '../../lib/invoiceData.js'

const payload = normalizeInvoicePayload({
  invoice: {
    invoice_number: 'INV-20260526-0001',
    payment_status: 'PAID',
    payment_method: 'CASH',
    subtotal: '240000.00',
    discount_amount: '10000.00',
    tax_amount: '18400.00',
    rounding_amount: '0.00',
    final_amount: '248400.00',
  },
  items: [
    { item_name: 'Bia Tiger', quantity: '2', unit_price: '30000.00', line_total: '60000.00' },
  ],
})

assert.equal(payload.invoice.final_amount, 248400)
assert.equal(payload.invoice.discount_amount, 10000)
assert.equal(payload.items[0].quantity, 2)
assert.equal(payload.items[0].line_total, 60000)
assert.equal(getPaymentStatusLabel('PAID', 'CASH'), 'Đã thanh toán (CASH)')
assert.equal(getPaymentStatusLabel('PENDING'), 'Chờ xác nhận thanh toán')
assert.equal(getPaymentStatusLabel('UNPAID'), 'Chưa thanh toán')
assert.equal(getInvoicePrintTitle({ invoice_number: 'INV-1', is_reprint: true }), 'Ban-in-lai-INV-1')
assert.deepEqual(getInvoicePrintSections(), {
  appChromeClass: 'no-print',
  receiptClass: 'printable-invoice',
})
