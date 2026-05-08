const { z } = require('zod');

const scanSchema = z.object({
  body: z.object({
    qr_code: z.string().min(1, 'Mã QR là bắt buộc'),
  }),
});

const createOrderSchema = z.object({
  body: z.object({
    session_version: z.number().int().positive('Session version phải là số nguyên dương'),
    items: z.array(
      z.object({
        menu_item_id: z.number().int().positive('Menu item ID không hợp lệ'),
        quantity: z.number().int().min(1, 'Số lượng phải ít nhất là 1').max(99, 'Số lượng tối đa là 99'),
        note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),
        options: z.array(
          z.object({
            option_id: z.number().int().positive('Option ID không hợp lệ'),
            quantity: z.number().int().min(1).max(10).optional(),
          })
        ).optional(),
      })
    ).min(1, 'Phải có ít nhất 1 món'),
  }),
});

const createRequestSchema = z.object({
  body: z.object({
    request_type: z.enum(['CALL_STAFF', 'REQUEST_BILL', 'OTHER'], {
      errorMap: () => ({ message: 'Loại yêu cầu không hợp lệ' }),
    }),
  }),
});

module.exports = {
  scanSchema,
  createOrderSchema,
  createRequestSchema,
};
