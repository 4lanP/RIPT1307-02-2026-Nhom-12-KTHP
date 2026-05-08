const sessionService = require('../services/session.service');
const { successResponse } = require('../utils/response.util');

async function getTables(req, res, next) {
  try {
    const result = await sessionService.getTables();
    return successResponse(res, 200, 'Lấy danh sách bàn thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getTableSession(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.getTableActiveSession(id);
    return successResponse(res, 200, 'Lấy session bàn thành công', result);
  } catch (err) {
    next(err);
  }
}

async function checkoutCash(req, res, next) {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (amount === undefined) return res.status(400).json({ success: false, message: 'amount là bắt buộc' });

    const result = await sessionService.checkoutCash(id, amount);
    return successResponse(res, 200, 'Thanh toán tiền mặt thành công', result);
  } catch (err) {
    next(err);
  }
}

async function cancelItem(req, res, next) {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;
    
    const result = await sessionService.cancelOrderItem(id, cancel_reason || 'Hết món');
    return successResponse(res, 200, 'Hủy món thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getRequests(req, res, next) {
  try {
    const result = await sessionService.getRequests();
    return successResponse(res, 200, 'Lấy danh sách yêu cầu thành công', result);
  } catch (err) {
    next(err);
  }
}

async function resolveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.resolveRequest(id);
    return successResponse(res, 200, 'Đã giải quyết yêu cầu', result);
  } catch (err) {
    next(err);
  }
}

async function forceCloseSession(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.forceCloseSession(id);
    return successResponse(res, 200, 'Buộc đóng session thành công', result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTables,
  getTableSession,
  checkoutCash,
  cancelItem,
  getRequests,
  resolveRequest,
  forceCloseSession,
};
