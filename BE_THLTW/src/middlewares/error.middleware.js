const { errorResponse } = require('../utils/response.util');
const { AppError, handleDatabaseError } = require('../utils/errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err.code && err.code.startsWith('23')) {
    error = handleDatabaseError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = new AppError('Token không hợp lệ', 401);
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError('Token đã hết hạn', 401);
  } else if (!(err instanceof AppError)) {
    error = new AppError(err.message || 'Lỗi hệ thống', err.statusCode || 500, false);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Lỗi hệ thống';
  const errors = error.errors || null;

  const logContext = {
    statusCode,
    message,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get('user-agent'),
  };

  if (statusCode >= 500) {
    logger.error('Server error', {
      ...logContext,
      stack: error.stack,
      originalError: error.originalError?.message,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client error', logContext);
  }

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    return errorResponse(res, statusCode, 'Lỗi hệ thống. Vui lòng thử lại sau.', null);
  }

  return errorResponse(res, statusCode, message, errors);
};

module.exports = errorHandler;
