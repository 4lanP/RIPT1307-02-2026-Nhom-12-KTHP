class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Xác thực thất bại') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Xung đột dữ liệu') {
    super(message, 409);
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.originalError = originalError;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`${service}: ${message}`, 502);
    this.service = service;
    this.originalError = originalError;
  }
}

function handleDatabaseError(error) {
  if (error.code === '23505') {
    return new ConflictError('Dữ liệu đã tồn tại');
  }
  if (error.code === '23503') {
    return new ValidationError('Dữ liệu tham chiếu không hợp lệ');
  }
  if (error.code === '23502') {
    return new ValidationError('Thiếu dữ liệu bắt buộc');
  }
  if (error.code === '23514') {
    return new ValidationError('Dữ liệu vi phạm ràng buộc');
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new DatabaseError('Không thể kết nối database', error);
  }
  return new DatabaseError('Lỗi database', error);
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  handleDatabaseError,
};
