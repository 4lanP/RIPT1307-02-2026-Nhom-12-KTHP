const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response.util');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return successResponse(res, 200, 'Dang nhap thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    const result = await authService.refresh({ refreshToken: refresh_token });
    return successResponse(res, 200, 'Refresh token thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const userId = req.user.id;
    await authService.logout(userId);
    return successResponse(res, 200, 'Dang xuat thanh cong');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
};
