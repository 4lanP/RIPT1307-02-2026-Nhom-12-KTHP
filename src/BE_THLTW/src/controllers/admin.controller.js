const reportService = require('../services/report.service');
const adminService = require('../services/admin.service');
const dishImageStorageService = require('../services/dishImageStorage.service');
const { successResponse } = require('../utils/response.util');

const send = (res, status, message, data) => successResponse(res, status, message, data);

async function getRevenue(req, res, next) {
  try {
    const { from, to, group_by } = req.query;
    const result = await reportService.getRevenueReport(from, to, group_by || 'day');
    return send(res, 200, 'Revenue report loaded', result);
  } catch (err) {
    next(err);
  }
}

async function getMenuReport(req, res, next) {
  try {
    const result = await reportService.getMenuReport();
    return send(res, 200, 'Menu report loaded', result);
  } catch (err) {
    next(err);
  }
}

async function getKdsReport(req, res, next) {
  try {
    const result = await reportService.getKdsReport();
    return send(res, 200, 'KDS report loaded', result);
  } catch (err) {
    next(err);
  }
}

async function exportReport(req, res, next) {
  try {
    await reportService.generateExcelReport(res);
  } catch (err) {
    next(err);
  }
}

async function resetMenuQuota(req, res, next) {
  try {
    const result = await reportService.resetMenuQuota();
    return send(res, 200, 'Menu quota reset', result);
  } catch (err) {
    next(err);
  }
}

async function uploadMenuImage(req, res, next) {
  try {
    const result = await dishImageStorageService.storeDishImage(req.file, {
      requestId: req.id,
      userId: req.user?.id,
      role: req.user?.role,
    });
    return send(res, 201, 'Upload dish image successfully', result);
  } catch (err) {
    next(err);
  }
}

function handler(serviceMethod, status, message, getArgs) {
  return async (req, res, next) => {
    try {
      const result = await serviceMethod(...getArgs(req));
      return send(res, status, message, result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  getRevenue,
  getMenuReport,
  getKdsReport,
  exportReport,
  resetMenuQuota,
  uploadMenuImage,

  listUsers: handler(adminService.listUsers, 200, 'Users loaded', () => []),
  createUser: handler(adminService.createUser, 201, 'User created', (req) => [req.body]),
  updateUser: handler(adminService.updateUser, 200, 'User updated', (req) => [req.params.id, req.body]),
  deleteUser: handler(adminService.deactivateUser, 200, 'User deactivated', (req) => [req.params.id]),

  listTables: handler(adminService.listTables, 200, 'Tables loaded', () => []),
  createTable: handler(adminService.createTable, 201, 'Table created', (req) => [req.body]),
  updateTable: handler(adminService.updateTable, 200, 'Table updated', (req) => [req.params.id, req.body]),
  deleteTable: handler(adminService.deleteTable, 200, 'Table deleted', (req) => [req.params.id]),

  listQrCodes: handler(adminService.listQrCodes, 200, 'QR codes loaded', (req) => [req.query.table_id]),
  createQrCode: handler(adminService.createQrCode, 201, 'QR code created', (req) => [req.body]),
  toggleQrCode: handler(adminService.toggleQrCode, 200, 'QR code toggled', (req) => [req.params.id]),
  deleteQrCode: handler(adminService.deleteQrCode, 200, 'QR code deleted', (req) => [req.params.id]),

  listCategories: handler(adminService.listCategories, 200, 'Categories loaded', () => []),
  createCategory: handler(adminService.createCategory, 201, 'Category created', (req) => [req.body]),
  updateCategory: handler(adminService.updateCategory, 200, 'Category updated', (req) => [req.params.id, req.body]),
  deleteCategory: handler(adminService.deleteCategory, 200, 'Category disabled', (req) => [req.params.id]),

  listItems: handler(adminService.listItems, 200, 'Menu items loaded', (req) => [req.query.category_id]),
  createItem: handler(adminService.createItem, 201, 'Menu item created', (req) => [req.body]),
  updateItem: handler(adminService.updateItem, 200, 'Menu item updated', (req) => [req.params.id, req.body]),
  deleteItem: handler(adminService.deleteItem, 200, 'Menu item disabled', (req) => [req.params.id]),

  listOptions: handler(adminService.listOptions, 200, 'Menu options loaded', (req) => [req.params.id]),
  createOption: handler(adminService.createOption, 201, 'Menu option created', (req) => [req.params.id, req.body]),
  updateOption: handler(adminService.updateOption, 200, 'Menu option updated', (req) => [req.params.id, req.body]),
  deleteOption: handler(adminService.deleteOption, 200, 'Menu option disabled', (req) => [req.params.id]),
};
