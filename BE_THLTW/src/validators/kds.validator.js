const { z } = require('zod');

const updateItemStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID phải là số').transform(Number),
  }),
  body: z.object({
    new_status: z.enum(['PREPARING', 'READY', 'SERVED'], {
      errorMap: () => ({ message: 'Trạng thái không hợp lệ' }),
    }),
  }),
});

const getOrdersSchema = z.object({
  query: z.object({
    station: z.enum(['GRILL', 'BAR', 'COLD'], {
      errorMap: () => ({ message: 'Station không hợp lệ' }),
    }),
  }),
});

module.exports = {
  updateItemStatusSchema,
  getOrdersSchema,
};
