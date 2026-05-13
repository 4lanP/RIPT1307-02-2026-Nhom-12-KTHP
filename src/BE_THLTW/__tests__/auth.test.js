require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
const bcrypt = require('bcrypt');
const authService = require('../src/services/auth.service');
const jwtUtil = require('../src/utils/jwt.util');

jest.mock('bcrypt');
jest.mock('../src/utils/jwt.util');

describe('Auth Service', () => {
  describe('login()', () => {
    it('logs in successfully and returns staff tokens', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@restaurant.com', password_hash: 'hashed', role: 'ADMIN', full_name: 'Admin', is_active: true }],
      }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // INSERT refresh token
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      bcrypt.compare.mockResolvedValue(true);
      jwtUtil.generateTokens.mockReturnValue({ accessToken: 'access', refreshToken: 'refresh' });

      const result = await authService.login({ email: 'admin@restaurant.com', password: 'password' });

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.user.role).toBe('ADMIN');
    });

    it('throws 401 for an incorrect password', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 1, password_hash: 'hashed', is_active: true }],
      }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login({ email: 'admin@test.com', password: 'wrong' }))
        .rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when the user does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      await expect(authService.login({ email: 'unknown@test.com', password: 'pass' }))
        .rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('refresh()', () => {
    it('rotates a valid refresh token and returns new tokens', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1 }] }); // SELECT refresh token
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'ADMIN', is_active: true }] }); // SELECT user
      mockClient.query.mockResolvedValueOnce({}); // UPDATE revoke old token
      mockClient.query.mockResolvedValueOnce({}); // INSERT new token
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      jwtUtil.verifyRefreshToken.mockReturnValue({ id: 1, role: 'ADMIN' });
      jwtUtil.generateTokens.mockReturnValue({ accessToken: 'new_access', refreshToken: 'new_refresh' });

      const result = await authService.refresh({ refreshToken: 'old_refresh' });

      expect(result.accessToken).toBe('new_access');
      expect(result.refreshToken).toBe('new_refresh');
    });

    it('rejects refresh tokens with invalid JWT signature before DB lookup', async () => {
      jwtUtil.verifyRefreshToken.mockReturnValue(null);

      await expect(authService.refresh({ refreshToken: 'invalid-jwt' }))
        .rejects.toMatchObject({ statusCode: 401, message: 'Refresh token khong hop le hoac da het han' });

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('rejects refresh tokens missing from the DB allowlist', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT refresh token
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      jwtUtil.verifyRefreshToken.mockReturnValue({ id: 1, role: 'ADMIN' });

      await expect(authService.refresh({ refreshToken: 'missing-db-token' }))
        .rejects.toMatchObject({ statusCode: 401, message: 'Refresh token khong hop le hoac da het han' });
    });

    it('rejects refresh tokens whose JWT payload does not match the DB token owner', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1 }] }); // SELECT refresh token
      mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

      jwtUtil.verifyRefreshToken.mockReturnValue({ id: 2, role: 'ADMIN' });

      await expect(authService.refresh({ refreshToken: 'mismatched-refresh' }))
        .rejects.toMatchObject({ statusCode: 401, message: 'Refresh token khong hop le hoac da het han' });
    });
  });
});
