const { verifyAccessToken } = require('../utils/jwt.util');
const { errorResponse } = require('../utils/response.util');
const db = require('../config/db');

exports.authenticateStaff = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse(res, 401, 'Không tìm thấy access token');
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);

      if (!decoded) {
        return errorResponse(res, 401, 'Token không hợp lệ hoặc đã hết hạn');
      }

      // Query DB to check user and active status
      const { rows } = await db.query('SELECT * FROM USERS WHERE id = $1 AND is_active = true', [decoded.id]);
      if (rows.length === 0) {
        return errorResponse(res, 403, 'Tài khoản không tồn tại hoặc đã bị khóa');
      }

      const user = rows[0];

      if (roles.length > 0 && !roles.includes(user.role)) {
        return errorResponse(res, 403, 'Không có quyền truy cập');
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
};

exports.authenticateSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Không tìm thấy session token');
    }

    const token = authHeader.split(' ')[1];

    // Query DB to check session status
    const { rows } = await db.query('SELECT * FROM SESSIONS WHERE id = $1 AND status = $2', [token, 'ACTIVE']);
    if (rows.length === 0) {
      return errorResponse(res, 401, 'Session không tồn tại hoặc đã đóng');
    }

    req.session = rows[0];
    next();
  } catch (error) {
    next(error);
  }
};
