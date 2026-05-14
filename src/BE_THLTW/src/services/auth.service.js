const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.util');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

async function login({ email, password }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. SELECT user
    const { rows } = await client.query('SELECT * FROM USERS WHERE email = $1 AND is_active = true', [email]);
    if (rows.length === 0) {
      throw new AuthenticationError('Email hoặc mật khẩu không chính xác');
    }

    const user = rows[0];

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AuthenticationError('Email hoặc mật khẩu không chính xác');
    }

    // 3. Generate tokens
    const payload = { id: user.id, role: user.role };
    const { accessToken, refreshToken } = generateTokens(payload);

    // 4. Hash refresh token with SHA256 for fast lookup and store in DB
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    // Tính toán expires_at (VD: 7 ngày sau)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await client.query(
      'INSERT INTO REFRESH_TOKENS (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    await client.query('COMMIT');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function refresh({ refreshToken }) {
  const decodedRefresh = verifyRefreshToken(refreshToken);
  if (!decodedRefresh || !decodedRefresh.id) {
    throw new AuthenticationError('Refresh token khong hop le hoac da het han');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const { rows } = await client.query(
      'SELECT * FROM REFRESH_TOKENS WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    if (rows.length === 0) {
      throw new AuthenticationError('Refresh token khong hop le hoac da het han');
    }

    const { user_id, id: tokenId } = rows[0];
    if (String(decodedRefresh.id) !== String(user_id)) {
      throw new AuthenticationError('Refresh token khong hop le hoac da het han');
    }

    const userRows = await client.query('SELECT * FROM USERS WHERE id = $1 AND is_active = true', [user_id]);
    if (userRows.rows.length === 0) {
      throw new AuthorizationError('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    const user = userRows.rows[0];
    const payload = { id: user.id, role: user.role };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload);

    // Revoke token cũ
    await client.query(
      'UPDATE REFRESH_TOKENS SET revoked_at = NOW() WHERE id = $1',
      [tokenId]
    );

    // Lưu token mới
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await client.query(
      'INSERT INTO REFRESH_TOKENS (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user_id, newTokenHash, expiresAt]
    );

    await client.query('COMMIT');

    return { accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function logout(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE REFRESH_TOKENS SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  login,
  refresh,
  logout,
};
