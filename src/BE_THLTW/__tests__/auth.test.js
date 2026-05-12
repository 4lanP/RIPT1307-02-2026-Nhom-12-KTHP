require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
const bcrypt = require('bcrypt');
const authService = require('../src/services/auth.service');
const jwtUtil = require('../src/utils/jwt.util');

jest.mock('bcrypt');
jest.mock('../src/utils/jwt.util');

describe('Auth Service', () => {
  describe('login()', () => {
    it('đăng nhập thành công trả về token', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@restaurant.com', password_hash: 'hashed', role: 'ADMIN', full_name: 'Admin', is_active: true }]
      }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // INSERT refresh token
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_refresh');
      jwtUtil.generateTokens.mockReturnValue({ accessToken: 'access', refreshToken: 'refresh' });

      const result = await authService.login({ email: 'admin@restaurant.com', password: 'password' });

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.user.role).toBe('ADMIN');
    });

    it('sai password ném lỗi 401', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, password_hash: 'hashed', is_active: true }]
      }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login({ email: 'admin@test.com', password: 'wrong' }))
        .rejects.toEqual({ statusCode: 401, message: 'Email hoặc mật khẩu không chính xác' });
    });

    it('user không tồn tại ném lỗi 401', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT user -> empty
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(authService.login({ email: 'unknown@test.com', password: 'pass' }))
        .rejects.toEqual({ statusCode: 401, message: 'Email hoặc mật khẩu không chính xác' });
    });
  });

  describe('refresh()', () => {
    it('refresh thành công', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }); // SELECT refresh token
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'ADMIN', is_active: true }] }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      jwtUtil.generateTokens.mockReturnValue({ accessToken: 'new_access' });

      const result = await authService.refresh({ refreshToken: 'old_refresh' });
      expect(result.accessToken).toBe('new_access');
    });

    it('token hết hạn hoặc không tồn tại ném lỗi 401', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT refresh token
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(authService.refresh({ refreshToken: 'invalid' }))
        .rejects.toEqual({ statusCode: 401, message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    });
  });
});
