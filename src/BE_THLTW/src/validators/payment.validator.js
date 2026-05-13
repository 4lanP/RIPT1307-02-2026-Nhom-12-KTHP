const { z } = require('zod');

const webhookPayloadSchema = z
  .object({
    query: z.record(z.string(), z.any()).optional(),
    body: z.record(z.string(), z.any()).optional(),
  })
  .superRefine((value, ctx) => {
    const payload = { ...(value.query || {}), ...(value.body || {}) };
    const requiredFields = ['vnp_TxnRef', 'vnp_Amount', 'vnp_ResponseCode', 'vnp_SecureHash'];

    requiredFields.forEach((field) => {
      if (!payload[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['query', field],
          message: `${field} is required`,
        });
      }
    });

    if (payload.vnp_Amount !== undefined && !/^\d+$/.test(String(payload.vnp_Amount))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['query', 'vnp_Amount'],
        message: 'vnp_Amount must be an integer amount in minor units',
      });
    }
  });

module.exports = {
  webhookPayloadSchema,
};
