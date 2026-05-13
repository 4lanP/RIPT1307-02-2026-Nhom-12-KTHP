const sessionService = require('../services/session.service');
const orderService = require('../services/order.service');
const { successResponse } = require('../utils/response.util');

async function scan(req, res, next) {
  try {
    const { qr_code } = req.body;
    const result = await sessionService.scan(qr_code);
    return successResponse(res, 200, 'Khoi tao session thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session_id = req.session.id;
    const result = await sessionService.getSession(session_id);
    return successResponse(res, 200, 'Lay thong tin session thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function getMenu(req, res, next) {
  try {
    const { category_id, station } = req.query;
    const result = await sessionService.getMenu({ category_id, station });
    return successResponse(res, 200, 'Lay menu thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const session_id = req.session.id;
    const { request_type } = req.body;
    const result = await sessionService.createCustomerRequest(session_id, request_type);
    return successResponse(res, 200, 'Da gui yeu cau den nhan vien', result);
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const session_id = req.session.id;
    const { items, session_version } = req.body;
    const result = await orderService.createOrder(session_id, items, session_version);
    return successResponse(res, 201, 'Dat mon thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function getOrders(req, res, next) {
  try {
    const session_id = req.session.id;
    const result = await orderService.getSessionOrders(session_id);
    return successResponse(res, 200, 'Lay danh sach don hang thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function createPayment(req, res, next) {
  try {
    const session_id = req.session.id;
    const ipAddr = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket?.remoteAddress;

    const paymentService = require('../services/payment.service');
    const result = await paymentService.createVNPayPayment(session_id, ipAddr);
    return successResponse(res, 200, 'Tao link thanh toan VNPay thanh cong', result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  scan,
  getSession,
  getMenu,
  createRequest,
  createOrder,
  getOrders,
  createPayment,
};
