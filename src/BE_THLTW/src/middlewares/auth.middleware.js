const { verifyAccessToken, verifySessionToken } = require('../utils/jwt.util');
const db = require('../config/db');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

exports.authenticateStaff = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AuthenticationError('Khong tim thay access token'));
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);

      if (!decoded) {
        return next(new AuthenticationError('Token khong hop le hoac da het han'));
      }

      const { rows } = await db.query('SELECT * FROM USERS WHERE id = $1 AND is_active = true', [decoded.id]);
      if (rows.length === 0) {
        return next(new AuthorizationError('Tai khoan khong ton tai hoac da bi khoa'));
      }

      const user = rows[0];

      if (roles.length > 0 && !roles.includes(user.role)) {
        return next(new AuthorizationError('Khong co quyen truy cap'));
      }

      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

exports.authorizeStaffRoles = (roles = []) => {
  return (req, res, next) => {
    if (roles.length > 0 && !roles.includes(req.user?.role)) {
      return next(new AuthorizationError('Khong co quyen truy cap'));
    }

    return next();
  };
};

exports.authenticateSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AuthenticationError('Khong tim thay session token'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifySessionToken(token);

    if (!decoded || !decoded.session_id) {
      return next(new AuthenticationError('Session token khong hop le hoac da het han'));
    }

    const { rows } = await db.query('SELECT * FROM SESSIONS WHERE id = $1 AND status = $2', [decoded.session_id, 'ACTIVE']);
    if (rows.length === 0) {
      return next(new AuthenticationError('Session khong ton tai hoac da dong'));
    }

    req.session = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
};
