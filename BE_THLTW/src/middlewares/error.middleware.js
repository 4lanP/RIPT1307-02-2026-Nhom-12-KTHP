const { errorResponse } = require('../utils/response.util');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Lỗi hệ thống';
  const errors = err.errors || null;

  // Xử lý các loại lỗi đặc thù (nếu có) như ValidationError, DatabaseError, v.v.

  return errorResponse(res, statusCode, message, errors);
};

module.exports = errorHandler;
