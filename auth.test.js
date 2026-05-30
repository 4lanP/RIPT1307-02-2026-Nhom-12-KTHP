/**
 * TEST SUITE: Auth Service
 * Covers: login(), refresh(), logout()
 *
 * Module được test: src/services/auth.service.js
 */

require('./helpers/mockDb');
const { mockClient } = require('./helpers/mockDb');
const bcrypt = require('bcrypt');
const authService = require('../src/services/auth.service');
const jwtUtil = require('../src/utils/jwt.util');

jest.mock('bcrypt');
jest.mock('../src/utils/jwt.util');

// ─────────────────────────────────────────────────────────────
// NHÓM 1: login()
// ─────────────────────────────────────────────────────────────
describe('Auth Service — login()', () => {

  it('TC-AUTH-01: Email và password đúng → trả về accessToken, refreshToken và thông tin user', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'admin@restaurant.com', password_hash: 'hashed', role: 'ADMIN', full_name: 'Admin Test', is_active: true }],
    }); // SELECT user
    mockClient.query.mockResolvedValueOnce({}); // INSERT refresh token
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    bcrypt.compare.mockResolvedValue(true);
    jwtUtil.generateTokens.mockReturnValue({ accessToken: 'access_token_xyz', refreshToken: 'refresh_token_xyz' });

    const result = await authService.login({ email: 'admin@restaurant.com', password: 'Password123!' });

    expect(result.accessToken).toBe('access_token_xyz');
    expect(result.refreshToken).toBe('refresh_token_xyz');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.full_name).toBe('Admin Test');
    expect(result.user).not.toHaveProperty('password_hash'); // Không trả về hash
  });

  it('TC-AUTH-02: Email tồn tại nhưng password sai → ném AuthenticationError (401)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, password_hash: 'hashed', is_active: true }],
    }); // SELECT user
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.login({ email: 'admin@restaurant.com', password: 'sai_mat_khau' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('TC-AUTH-03: Email không tồn tại trong DB → ném AuthenticationError (401)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT user → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(authService.login({ email: 'ghost@restaurant.com', password: 'anypass' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('TC-AUTH-04: Tài khoản is_active = false (bị khóa) → ném AuthenticationError (401)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    // is_active = false → query WHERE is_active = true trả về empty
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(authService.login({ email: 'blocked@restaurant.com', password: 'pass' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('TC-AUTH-05: Refresh token được lưu vào DB dưới dạng SHA-256 hash (không lưu raw)', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'admin@restaurant.com', password_hash: 'hashed', role: 'ADMIN', full_name: 'Admin', is_active: true }],
    });
    mockClient.query.mockResolvedValueOnce({}); // INSERT
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    bcrypt.compare.mockResolvedValue(true);
    jwtUtil.generateTokens.mockReturnValue({ accessToken: 'access', refreshToken: 'raw-refresh-token' });

    await authService.login({ email: 'admin@restaurant.com', password: 'pass' });

    const insertCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('INSERT INTO REFRESH_TOKENS')
    );
    // Token lưu vào DB KHÔNG phải 'raw-refresh-token'
    expect(insertCall[1][1]).not.toBe('raw-refresh-token');
    // Phải là SHA-256 hex (64 ký tự)
    expect(insertCall[1][1]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('TC-AUTH-06: DB lỗi khi INSERT refresh token → ROLLBACK được gọi', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: 1, password_hash: 'hashed', role: 'ADMIN', is_active: true }],
    });
    mockClient.query.mockRejectedValueOnce(new Error('DB insert failed')); // INSERT lỗi
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    bcrypt.compare.mockResolvedValue(true);
    jwtUtil.generateTokens.mockReturnValue({ accessToken: 'a', refreshToken: 'r' });

    await expect(authService.login({ email: 'admin@restaurant.com', password: 'pass' }))
      .rejects.toThrow('DB insert failed');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 2: refresh()
// ─────────────────────────────────────────────────────────────
describe('Auth Service — refresh()', () => {

  it('TC-REF-01: Refresh token hợp lệ → xoay token, trả về cặp token mới', async () => {
    jwtUtil.verifyRefreshToken.mockReturnValue({ id: 1, role: 'ADMIN' });

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1 }] }); // SELECT REFRESH_TOKENS
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'ADMIN', is_active: true }] }); // SELECT user
    mockClient.query.mockResolvedValueOnce({}); // UPDATE revoke old
    mockClient.query.mockResolvedValueOnce({}); // INSERT new token
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    jwtUtil.generateTokens.mockReturnValue({ accessToken: 'new_access', refreshToken: 'new_refresh' });

    const result = await authService.refresh({ refreshToken: 'valid-refresh' });

    expect(result.accessToken).toBe('new_access');
    expect(result.refreshToken).toBe('new_refresh');
  });

  it('TC-REF-02: JWT signature không hợp lệ → ném 401, không query DB', async () => {
    jwtUtil.verifyRefreshToken.mockReturnValue(null);

    await expect(authService.refresh({ refreshToken: 'tampered-token' }))
      .rejects.toMatchObject({ statusCode: 401 });

    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('TC-REF-03: Token không có trong DB (đã bị revoke hoặc hết hạn) → ném 401', async () => {
    jwtUtil.verifyRefreshToken.mockReturnValue({ id: 1 });

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT → không tìm thấy
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(authService.refresh({ refreshToken: 'expired-token' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('TC-REF-04: JWT payload user_id không khớp DB token owner → ném 401 (prevent token swap attack)', async () => {
    jwtUtil.verifyRefreshToken.mockReturnValue({ id: 99 }); // attacker user

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1 }] }); // token owner = user 1
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(authService.refresh({ refreshToken: 'swapped-token' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('TC-REF-05: Token hợp lệ nhưng user bị deactivate → ném 403', async () => {
    jwtUtil.verifyRefreshToken.mockReturnValue({ id: 1 });

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // SELECT user → is_active=false trả empty
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(authService.refresh({ refreshToken: 'valid-token' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('TC-REF-06: Token cũ được REVOKE sau khi xoay (token rotation)', async () => {
    jwtUtil.verifyRefreshToken.mockReturnValue({ id: 1 });
    jwtUtil.generateTokens.mockReturnValue({ accessToken: 'a', refreshToken: 'new_r' });

    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1 }] });
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1, role: 'MANAGER', is_active: true }] });
    mockClient.query.mockResolvedValueOnce({}); // UPDATE revoke
    mockClient.query.mockResolvedValueOnce({}); // INSERT new
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    await authService.refresh({ refreshToken: 'old-token' });

    const revokeCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE REFRESH_TOKENS SET revoked_at')
    );
    expect(revokeCall).toBeDefined();
    expect(revokeCall[1][0]).toBe(10); // revoke token id = 10
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 3: logout()
// ─────────────────────────────────────────────────────────────
describe('Auth Service — logout()', () => {

  it('TC-LGOUT-01: Đăng xuất thành công → tất cả refresh token của user bị revoke', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockResolvedValueOnce({}); // UPDATE revoke all tokens
    mockClient.query.mockResolvedValueOnce({}); // COMMIT

    const result = await authService.logout(1);

    expect(result.success).toBe(true);
    const updateCall = mockClient.query.mock.calls.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE REFRESH_TOKENS SET revoked_at')
    );
    expect(updateCall[1][0]).toBe(1); // user_id = 1
  });

  it('TC-LGOUT-02: DB lỗi khi logout → ROLLBACK được gọi', async () => {
    mockClient.query.mockResolvedValueOnce({}); // BEGIN
    mockClient.query.mockRejectedValueOnce(new Error('DB error'));
    mockClient.query.mockResolvedValueOnce({}); // ROLLBACK

    await expect(authService.logout(1)).rejects.toThrow('DB error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
