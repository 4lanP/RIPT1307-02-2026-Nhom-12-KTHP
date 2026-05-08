const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response.util');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email và password là bắt buộc' });
    }

    const result = await authService.login({ email, password });
    return successResponse(res, 200, 'Đăng nhập thành công', result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'refresh_token là bắt buộc' });
    }

    const result = await authService.refresh({ refreshToken: refresh_token });
    return successResponse(res, 200, 'Refresh token thành công', result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const userId = req.user.id;
    await authService.logout(userId);
    return successResponse(res, 200, 'Đăng xuất thành công');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
};
