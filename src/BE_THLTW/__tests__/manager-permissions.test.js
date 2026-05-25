require('./helpers/mockDb');
const express = require('express');
const { mockPool } = require('./helpers/mockDb');
const jwtUtil = require('../src/utils/jwt.util');
const errorHandler = require('../src/middlewares/error.middleware');

jest.mock('../src/utils/jwt.util');

jest.mock('../src/controllers/admin.controller', () => ({
  getRevenue: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  getMenuReport: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  getKdsReport: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  exportReport: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  resetMenuQuota: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  listUsers: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  createUser: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  updateUser: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  deleteUser: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  listTables: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  createTable: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  updateTable: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  deleteTable: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  listQrCodes: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  createQrCode: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  toggleQrCode: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  deleteQrCode: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  listCategories: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  createCategory: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  updateCategory: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  deleteCategory: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  listItems: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  createItem: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  updateItem: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  deleteItem: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  uploadMenuImage: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  listOptions: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  createOption: jest.fn((_req, res) => res.status(201).json({ success: true, data: {} })),
  updateOption: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  deleteOption: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
}));

jest.mock('../src/controllers/staff.controller', () => ({
  getTables: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  getTableSession: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  checkoutCash: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  getRequests: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  resolveRequest: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  cancelItem: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  forceCloseSession: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
}));

jest.mock('../src/controllers/kds.controller', () => ({
  getOrders: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
  updateItemStatus: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
}));

const adminRoutes = require('../src/routes/admin.routes');
const staffRoutes = require('../src/routes/staff.routes');
const kdsRoutes = require('../src/routes/kds.routes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use('/staff', staffRoutes);
  app.use('/kds', kdsRoutes);
  app.use(errorHandler);
  return app;
}

function makeRequest(app, method, path, role, body) {
  jwtUtil.verifyAccessToken.mockReturnValue({ id: 1 });
  mockPool.query.mockResolvedValueOnce({
    rows: [{ id: 1, role, is_active: true }],
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${role.toLowerCase()}-token`,
            'content-type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        resolve({ status: response.status, body: json });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

describe('Manager operations permission matrix', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jwtUtil.verifyAccessToken.mockReset();
  });

  it.each([
    ['GET', '/admin/reports/revenue?from=2026-05-01&to=2026-05-24&group_by=day', 200],
    ['GET', '/admin/reports/menu', 200],
    ['GET', '/admin/reports/kds', 200],
    ['GET', '/admin/tables', 200],
    ['GET', '/admin/menu/categories', 200],
    ['GET', '/admin/menu/items', 200],
    ['POST', '/admin/menu/images', 201],
    ['POST', '/admin/menu/reset-quota', 200],
  ])('allows MANAGER to access operational admin route %s %s', async (method, path, expectedStatus) => {
    const response = await makeRequest(app, method, path, 'MANAGER');

    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual(expect.objectContaining({ success: true }));
  });

  it.each([
    ['GET', '/staff/tables'],
    ['GET', '/staff/requests'],
    ['POST', '/staff/sessions/1/force-close'],
  ])('keeps MANAGER access to staff operational route %s %s', async (method, path) => {
    const response = await makeRequest(app, method, path, 'MANAGER');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true }));
  });

  it.each([
    ['POST', '/admin/users', { email: 'new@example.com', password: 'Password123!', full_name: 'New User', role: 'WAITER' }],
    ['PUT', '/admin/users/1', { full_name: 'Updated User' }],
  ])('denies MANAGER user-management route %s %s', async (method, path, body) => {
    const response = await makeRequest(app, method, path, 'MANAGER', body);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });

  it('keeps ADMIN access to user management', async () => {
    const response = await makeRequest(app, 'GET', '/admin/users', 'ADMIN');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true }));
  });

  it.each(['CASHIER', 'WAITER', 'KITCHEN'])('denies %s access to manager operational admin routes', async (role) => {
    const response = await makeRequest(app, 'GET', '/admin/reports/revenue?from=2026-05-01&to=2026-05-24&group_by=day', role);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });

  it.each(['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'])('keeps KDS HTTP access denied for %s', async (role) => {
    const response = await makeRequest(app, 'GET', '/kds/orders?station=GRILL', role);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });

  it('keeps KITCHEN access to KDS HTTP routes', async () => {
    const response = await makeRequest(app, 'GET', '/kds/orders?station=GRILL', 'KITCHEN');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true }));
  });
});
