const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { generateTokens } = require('../utils/jwt.util');

async function login({ email, password }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. SELECT user
    const { rows } = await client.query('SELECT * FROM USERS WHERE email = $1 AND is_active = true', [email]);
    if (rows.length === 0) {
      throw { statusCode: 401, message: 'Email hoặc mật khẩu không chính xác' };
    }

    const user = rows[0];

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Email hoặc mật khẩu không chính xác' };
    }

    // 3. Generate tokens
    const payload = { id: user.id, role: user.role };
    const { accessToken, refreshToken } = generateTokens(payload);

    // 4. Hash refresh token and store in DB
    const tokenHash = await bcrypt.hash(refreshToken, 10);
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mặc dù ta có token_hash, việc query bằng bcrypt.compare trên toàn bảng là không khả thi.
    // Vì vậy, ta cần decode token để lấy user_id trước, sau đó query REFRESH_TOKENS của user_id đó
    // Tuy nhiên theo thiêt kế "Hash token đầu vào, SELECT FROM REFRESH_TOKENS WHERE token_hash = $1"
    // Nếu thiết kế lưu Hash trực tiếp (SHA256) thì mới query where được. Còn bcrypt thì không.
    // Ở đây tôi dùng SHA256 để băm refresh token dùng cho việc tra cứu nhanh thay vì bcrypt.
    
    // Đợi đã, để sửa lại dùng mã hóa SHA256 cho refresh token ở đây cho việc query:
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const { rows } = await client.query(
      'SELECT * FROM REFRESH_TOKENS WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    if (rows.length === 0) {
      throw { statusCode: 401, message: 'Refresh token không hợp lệ hoặc đã hết hạn' };
    }

    const { user_id } = rows[0];

    const userRows = await client.query('SELECT * FROM USERS WHERE id = $1 AND is_active = true', [user_id]);
    if (userRows.rows.length === 0) {
      throw { statusCode: 403, message: 'Tài khoản không tồn tại hoặc đã bị khóa' };
    }

    const user = userRows.rows[0];
    const payload = { id: user.id, role: user.role };
    
    // Ta chỉ trả về access_token mới (giữ nguyên refresh token cũ)
    const { generateTokens } = require('../utils/jwt.util');
    const tokens = generateTokens(payload);
    
    await client.query('COMMIT');

    return { accessToken: tokens.accessToken };
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
