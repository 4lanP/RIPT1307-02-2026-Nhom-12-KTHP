const reportService = require('../services/report.service');
const { successResponse } = require('../utils/response.util');

async function getRevenue(req, res, next) {
  try {
    const { from, to, group_by } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from và to là bắt buộc (YYYY-MM-DD)' });
    }
    const result = await reportService.getRevenueReport(from, to, group_by || 'day');
    return successResponse(res, 200, 'Lấy báo cáo doanh thu thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getMenuReport(req, res, next) {
  try {
    const result = await reportService.getMenuReport();
    return successResponse(res, 200, 'Lấy báo cáo món ăn thành công', result);
  } catch (err) {
    next(err);
  }
}

async function getKdsReport(req, res, next) {
  try {
    const result = await reportService.getKdsReport();
    return successResponse(res, 200, 'Lấy báo cáo KDS thành công', result);
  } catch (err) {
    next(err);
  }
}

async function exportReport(req, res, next) {
  try {
    // Không dùng successResponse vì hàm này trả về stream Excel file
    await reportService.generateExcelReport(res);
  } catch (err) {
    next(err);
  }
}

async function resetMenuQuota(req, res, next) {
  try {
    const result = await reportService.resetMenuQuota();
    return successResponse(res, 200, 'Đã reset daily quota cho tất cả món ăn', result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRevenue,
  getMenuReport,
  getKdsReport,
  exportReport,
  resetMenuQuota,
};
