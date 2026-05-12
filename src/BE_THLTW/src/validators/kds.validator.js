const { z } = require('zod');

const updateItemStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID không hợp lệ'),
  }),
  body: z.object({
    new_status: z.enum(['PREPARING', 'READY', 'SERVED'], {
      errorMap: () => ({ message: 'Trạng thái không hợp lệ' }),
    }),
  }),
});

const getOrdersSchema = z.object({
  query: z.object({
    station: z.enum(['GRILL', 'BAR', 'COLD', 'KITCHEN'], {
      errorMap: () => ({ message: 'Station không hợp lệ' }),
    }),
  }),
});

module.exports = {
  updateItemStatusSchema,
  getOrdersSchema,
};
