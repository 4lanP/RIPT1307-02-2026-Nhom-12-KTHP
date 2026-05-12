const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response.util');

exports.scanRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 5, // Tối đa 5 requests / IP / phút
  handler: (req, res) => {
    return errorResponse(res, 429, 'Gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau 1 phút.');
  },
});
