const kdsService = require('../services/kds.service');
const { successResponse } = require('../utils/response.util');

async function getOrders(req, res, next) {
  try {
    const { station } = req.query;
    if (!station) {
      return res.status(400).json({ success: false, message: 'station là bắt buộc' });
    }

    const result = await kdsService.getOrdersByStation(station);
    return successResponse(res, 200, 'Lấy danh sách đơn hàng thành công', result);
  } catch (err) {
    next(err);
  }
}

async function updateItemStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { new_status } = req.body;
    const user_id = req.user.id;

    if (!new_status || !['PREPARING', 'READY', 'SERVED'].includes(new_status)) {
      return res.status(400).json({ success: false, message: 'new_status không hợp lệ' });
    }

    const result = await kdsService.updateOrderItemStatus(id, new_status, user_id);
    return successResponse(res, 200, 'Cập nhật trạng thái món thành công', result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrders,
  updateItemStatus,
};
