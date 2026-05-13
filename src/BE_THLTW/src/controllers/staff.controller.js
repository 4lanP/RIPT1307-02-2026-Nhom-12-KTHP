const sessionService = require('../services/session.service');
const { successResponse } = require('../utils/response.util');

async function getTables(req, res, next) {
  try {
    const result = await sessionService.getTables();
    return successResponse(res, 200, 'Lay danh sach ban thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function getTableSession(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.getTableActiveSession(id);
    return successResponse(res, 200, 'Lay session ban thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function checkoutCash(req, res, next) {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const result = await sessionService.checkoutCash(id, amount);
    return successResponse(res, 200, 'Thanh toan tien mat thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function cancelItem(req, res, next) {
  try {
    const { id } = req.params;
    const { cancel_reason } = req.body;
    const result = await sessionService.cancelOrderItem(id, cancel_reason || 'Het mon');
    return successResponse(res, 200, 'Huy mon thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function getRequests(req, res, next) {
  try {
    const result = await sessionService.getRequests();
    return successResponse(res, 200, 'Lay danh sach yeu cau thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function resolveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.resolveRequest(id);
    return successResponse(res, 200, 'Da giai quyet yeu cau', result);
  } catch (err) {
    next(err);
  }
}

async function forceCloseSession(req, res, next) {
  try {
    const { id } = req.params;
    const result = await sessionService.forceCloseSession(id);
    return successResponse(res, 200, 'Buoc dong session thanh cong', result);
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
