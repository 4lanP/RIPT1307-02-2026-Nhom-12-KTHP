const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  handleDatabaseError
} = require('../src/utils/errors');

describe('Errors Utility', () => {
  describe('Custom Error Classes', () => {
    it('AppError should have correct properties', () => {
      const error = new AppError('test error', 400, false);
      expect(error.message).toBe('test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(false);
      expect(error.name).toBe('AppError');
    });

    it('ValidationError should set default properties', () => {
      const error = new ValidationError('validation failed', { field: 'required' });
      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual({ field: 'required' });
    });

    it('AuthenticationError should set default properties', () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Xác thực thất bại');
    });

    it('AuthorizationError should set default properties', () => {
      const error = new AuthorizationError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Không có quyền truy cập');
    });

    it('NotFoundError should set default properties', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Không tìm thấy tài nguyên');
    });

    it('ConflictError should set default properties', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Xung đột dữ liệu');
    });

    it('DatabaseError should set default properties', () => {
      const error = new DatabaseError('DB failed', new Error('Original DB Error'));
      expect(error.statusCode).toBe(500);
      expect(error.originalError.message).toBe('Original DB Error');
    });

    it('ExternalServiceError should set default properties', () => {
      const error = new ExternalServiceError('VNPay', 'Timeout');
      expect(error.statusCode).toBe(502);
      expect(error.message).toBe('VNPay: Timeout');
      expect(error.service).toBe('VNPay');
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle unique violation (23505)', () => {
      const result = handleDatabaseError({ code: '23505' });
      expect(result).toBeInstanceOf(ConflictError);
      expect(result.message).toBe('Dữ liệu đã tồn tại');
    });

    it('should handle foreign key violation (23503)', () => {
      const result = handleDatabaseError({ code: '23503' });
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Dữ liệu tham chiếu không hợp lệ');
    });

    it('should handle not null violation (23502)', () => {
      const result = handleDatabaseError({ code: '23502' });
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Thiếu dữ liệu bắt buộc');
    });

    it('should handle check constraint violation (23514)', () => {
      const result = handleDatabaseError({ code: '23514' });
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Dữ liệu vi phạm ràng buộc');
    });

    it('should handle connection refused', () => {
      const result = handleDatabaseError({ code: 'ECONNREFUSED' });
      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('Không thể kết nối database');
    });

    it('should handle other database errors', () => {
      const result = handleDatabaseError({ code: '99999' });
      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('Lỗi database');
    });
  });
});
