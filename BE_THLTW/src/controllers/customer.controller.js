const sessionService = require('../services/session.service');
const orderService = require('../services/order.service');
const { successResponse } = require('../utils/response.util');

async function scan(req, res, next) {
  try {
    const { qr_code } = req.body;
    if (!qr_code) {
      return res.status(400).json({ success: false, message: 'qr_code là bắt buộc' });
    }
    const result = await sessionService.scan(qr_code);
    return successResponse(res, 200, 'Khởi tạo session thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session_id = req.session.id;
    const result = await sessionService.getSession(session_id);
    return successResponse(res, 200, 'Lấy thông tin session thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getMenu(req, res, next) {
  try {
    const { category_id, station } = req.query;
    const result = await sessionService.getMenu({ category_id, station });
    return successResponse(res, 200, 'Lấy menu thành công', result);
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const session_id = req.session.id;
    const { request_type } = req.body;
    if (!['CALL_STAFF', 'REQUEST_BILL', 'OTHER'].includes(request_type)) {
      return res.status(400).json({ success: false, message: 'request_type không hợp lệ' });
    }
    const result = await sessionService.createCustomerRequest(session_id, request_type);
    return successResponse(res, 200, 'Đã gửi yêu cầu đến nhân viên', result);
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const session_id = req.session.id;
    const { items, session_version } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách món ăn không được để trống' });
    }
    
    if (session_version === undefined) {
      return res.status(400).json({ success: false, message: 'Yêu cầu session_version' });
    }

    const result = await orderService.createOrder(session_id, items, session_version);
    return successResponse(res, 201, 'Đặt món thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getOrders(req, res, next) {
  try {
    const session_id = req.session.id;
    const result = await orderService.getSessionOrders(session_id);
    return successResponse(res, 200, 'Lấy danh sách đơn hàng thành công', result);
  } catch (err) {
    next(err);
  }
}

async function createPayment(req, res, next) {
  try {
    const session_id = req.session.id;
    // Lấy IP của user (Express xử lý nếu sau Nginx cần cấu hình trust proxy)
    const ipAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

    const paymentService = require('../services/payment.service');
    const result = await paymentService.createVNPayPayment(session_id, ipAddr);
    return successResponse(res, 200, 'Tạo link thanh toán VNPay thành công', result);
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
