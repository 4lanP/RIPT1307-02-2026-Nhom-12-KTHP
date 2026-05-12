const { z } = require('zod');

const updateItemStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('ID is invalid'),
  }),
  body: z.object({
    new_status: z.enum(['PREPARING', 'READY', 'SERVED']),
  }),
});

const getOrdersSchema = z.object({
  query: z.object({
    station: z.enum(['GRILL', 'BAR', 'COLD']),
  }),
});

module.exports = {
  updateItemStatusSchema,
  getOrdersSchema,
};
