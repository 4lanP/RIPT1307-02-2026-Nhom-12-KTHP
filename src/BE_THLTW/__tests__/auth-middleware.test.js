require('./helpers/mockDb');
const { mockPool } = require('./helpers/mockDb');
const jwtUtil = require('../src/utils/jwt.util');
const { authenticateStaff, authorizeStaffRoles, authenticateSession } = require('../src/middlewares/auth.middleware');
const errorHandler = require('../src/middlewares/error.middleware');

jest.mock('../src/utils/jwt.util');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function createErrorRequest() {
  return {
    method: 'GET',
    originalUrl: '/api/test',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest'),
  };
}

function expectHandledError(error, statusCode) {
  const res = createResponse();
  errorHandler(error, createErrorRequest(), res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(statusCode);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: false,
    message: expect.any(String),
  }));
}

describe('Staff authorization middleware', () => {
  beforeEach(() => {
    jwtUtil.verifyAccessToken.mockReset();
    jwtUtil.verifySessionToken.mockReset();
  });

  it('allows WAITER when the staff route includes the WAITER role', async () => {
    const req = {
      headers: { authorization: 'Bearer waiter-token' },
    };
    const res = createResponse();
    const next = jest.fn();

    jwtUtil.verifyAccessToken.mockReturnValue({ id: 5 });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 5, role: 'WAITER', is_active: true }],
    });

    await authenticateStaff(['CASHIER', 'MANAGER', 'ADMIN', 'WAITER'])(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user.role).toBe('WAITER');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes forbidden staff access through the shared error middleware', async () => {
    const req = {
      headers: { authorization: 'Bearer waiter-token' },
    };
    const res = createResponse();
    const next = jest.fn();

    jwtUtil.verifyAccessToken.mockReturnValue({ id: 5 });
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 5, role: 'WAITER', is_active: true }],
    });

    await authenticateStaff(['CASHIER', 'MANAGER', 'ADMIN'])(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expectHandledError(next.mock.calls[0][0], 403);
  });

  it('keeps privileged endpoint checks after shared staff auth passes', () => {
    const req = { user: { id: 5, role: 'WAITER' } };
    const res = createResponse();
    const next = jest.fn();

    authorizeStaffRoles(['CASHIER', 'MANAGER', 'ADMIN'])(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expectHandledError(next.mock.calls[0][0], 403);
  });

  it('passes missing customer session tokens through the shared error middleware', async () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    await authenticateSession(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expectHandledError(next.mock.calls[0][0], 401);
  });
});
