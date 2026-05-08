const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token là bắt buộc'),
  }),
});

module.exports = {
  loginSchema,
  refreshSchema,
};
