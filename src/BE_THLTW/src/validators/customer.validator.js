const { z } = require('zod');

const positiveInt = (message) => z.coerce.number().int().positive(message);

const scanSchema = z.object({
  body: z.object({
    qr_code: z.string().min(1, 'QR code is required'),
  }),
});

const createOrderSchema = z.object({
  body: z.object({
    session_version: positiveInt('Session version must be a positive integer'),
    items: z.array(
      z.object({
        menu_item_id: positiveInt('Menu item ID is invalid'),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity must be at most 99'),
        note: z.string().max(500, 'Note must be at most 500 characters').optional(),
        options: z.array(
          z.object({
            option_id: positiveInt('Option ID is invalid'),
            quantity: z.coerce.number().int().min(1).max(10).optional(),
          })
        ).optional(),
      })
    ).min(1, 'At least one item is required'),
  }),
});

const createRequestSchema = z.object({
  body: z.object({
    request_type: z.enum(['CALL_STAFF', 'REQUEST_BILL', 'OTHER']),
  }),
});

const getMenuSchema = z.object({
  query: z.object({
    category_id: positiveInt('Category ID is invalid').optional(),
    station: z.enum(['GRILL', 'BAR', 'COLD']).optional(),
  }),
});

const createPaymentSchema = z.object({
  body: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
});

const emptySchema = z.object({
  body: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
});

module.exports = {
  scanSchema,
  getMenuSchema,
  createOrderSchema,
  createRequestSchema,
  createPaymentSchema,
  emptySchema,
};
