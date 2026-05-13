const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email khong hop le'),
    password: z.string().min(8, 'Mat khau phai co it nhat 8 ky tu'),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token la bat buoc'),
  }),
});

const emptySchema = z.object({
  body: z.object({}).strict().optional(),
  query: z.object({}).strict().optional(),
  params: z.object({}).strict().optional(),
});

module.exports = {
  loginSchema,
  refreshSchema,
  emptySchema,
};
