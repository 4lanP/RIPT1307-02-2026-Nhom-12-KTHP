const { z } = require('zod');

const id = z.coerce.number().int().positive('ID is invalid');

const idParamSchema = z.object({
  params: z.object({ id }),
});

const emptySchema = z.object({
  body: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
});

const checkoutCashSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    amount: z.coerce.number().nonnegative('Amount must be non-negative'),
  }),
});

const cancelItemSchema = z.object({
  params: z.object({ id }),
  body: z.object({
    cancel_reason: z.string().min(1).max(500).optional(),
  }),
});

module.exports = {
  idParamSchema,
  emptySchema,
  checkoutCashSchema,
  cancelItemSchema,
};
