const kdsService = require('../services/kds.service');
const { successResponse } = require('../utils/response.util');

async function getOrders(req, res, next) {
  try {
    const { station } = req.query;
    const result = await kdsService.getOrdersByStation(station);
    return successResponse(res, 200, 'Lay danh sach don hang thanh cong', result);
  } catch (err) {
    next(err);
  }
}

async function updateItemStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { new_status } = req.body;
    const user_id = req.user.id;
    const result = await kdsService.updateOrderItemStatus(id, new_status, user_id);
    return successResponse(res, 200, 'Cap nhat trang thai mon thanh cong', result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrders,
  updateItemStatus,
};
