export function toMoney(value) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

export function normalizeInvoicePayload(payload) {
  const invoice = payload?.invoice || {}
  const items = Array.isArray(payload?.items) ? payload.items : []

  return {
    invoice: {
      ...invoice,
      subtotal: toMoney(invoice.subtotal),
      discount_amount: toMoney(invoice.discount_amount),
      tax_amount: toMoney(invoice.tax_amount),
      rounding_amount: toMoney(invoice.rounding_amount),
      final_amount: toMoney(invoice.final_amount),
      is_reprint: Boolean(invoice.is_reprint),
    },
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unit_price: toMoney(item.unit_price),
      options_total: toMoney(item.options_total),
      line_total: toMoney(item.line_total),
      note: item.note || '',
    })),
  }
}

export function getPaymentStatusLabel(status, method) {
  if (status === 'PAID') return method ? `Đã thanh toán (${method})` : 'Đã thanh toán'
  if (status === 'PENDING') return 'Chờ xác nhận thanh toán'
  return 'Chưa thanh toán'
}

export function getInvoicePrintTitle(invoice) {
  const number = invoice?.invoice_number || 'Hoa-don'
  return `${invoice?.is_reprint ? 'Ban-in-lai-' : ''}${number}`
}

export function getInvoicePrintSections() {
  return {
    appChromeClass: 'no-print',
    receiptClass: 'printable-invoice',
  }
}
