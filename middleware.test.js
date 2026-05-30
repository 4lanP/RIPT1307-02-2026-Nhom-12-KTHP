/**
 * TEST SUITE: Auth Middleware + Validation
 * Covers:
 *   - authenticateSession (customer JWT)
 *   - authenticateStaff (staff JWT)
 *   - authorizeStaffRoles (RBAC)
 *   - validate middleware (Zod schemas)
 *
 * Modules: src/middlewares/auth.middleware.js
 *           src/middlewares/validate.middleware.js
 *           src/validators/customer.validator.js
 */

const { authenticateSession, authenticateStaff, authorizeStaffRoles } = require('../src/middlewares/auth.middleware');
const { validate } = require('../src/middlewares/validate.middleware');
const { createOrderSchema, scanSchema, createRequestSchema, getMenuSchema } = require('../src/validators/customer.validator');

jest.mock('../src/utils/jwt.util');
const jwtUtil = require('../src/utils/jwt.util');

// ─────────────────────────────────────────────────────────────
// Helper tạo mock req, res, next
// ─────────────────────────────────────────────────────────────
function makeReqRes(headers = {}, body = {}, query = {}, params = {}) {
  const req = { headers, body, query, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  return { req, res, next };
}

// ─────────────────────────────────────────────────────────────
// NHÓM 1: authenticateSession — Middleware xác thực khách hàng
// ─────────────────────────────────────────────────────────────
describe('Middleware — authenticateSession()', () => {

  it('TC-MDW-01: Session token hợp lệ → gán req.session_id và gọi next()', () => {
    jwtUtil.verifySessionToken = jest.fn().mockReturnValue({ session_id: 42 });

    const { req, res, next } = makeReqRes({ authorization: 'Bearer valid-session-token' });
    authenticateSession(req, res, next);

    expect(req.session_id).toBe(42);
    expect(next).toHaveBeenCalledWith(); // next() không có error
  });

  it('TC-MDW-02: Không có Authorization header → trả 401', () => {
    const { req, res, next } = makeReqRes({});
    authenticateSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalledWith();
  });

  it('TC-MDW-03: Token sai format (không có "Bearer ") → trả 401', () => {
    const { req, res, next } = makeReqRes({ authorization: 'invalid-format-token' });
    jwtUtil.verifySessionToken = jest.fn().mockReturnValue(null);

    authenticateSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('TC-MDW-04: Token đã hết hạn (verifySessionToken trả null) → trả 401', () => {
    jwtUtil.verifySessionToken = jest.fn().mockReturnValue(null);
    const { req, res, next } = makeReqRes({ authorization: 'Bearer expired-token' });

    authenticateSession(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalledWith();
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 2: authenticateStaff — Middleware xác thực nhân viên
// ─────────────────────────────────────────────────────────────
describe('Middleware — authenticateStaff()', () => {

  it('TC-MDW-05: Access token hợp lệ, role ADMIN được phép → gọi next()', () => {
    jwtUtil.verifyAccessToken = jest.fn().mockReturnValue({ id: 1, role: 'ADMIN' });

    const { req, res, next } = makeReqRes({ authorization: 'Bearer valid-admin-token' });
    const middleware = authenticateStaff(['ADMIN', 'MANAGER']);
    middleware(req, res, next);

    expect(req.user).toEqual({ id: 1, role: 'ADMIN' });
    expect(next).toHaveBeenCalledWith();
  });

  it('TC-MDW-06: Role WAITER không có trong whitelist → trả 403', () => {
    jwtUtil.verifyAccessToken = jest.fn().mockReturnValue({ id: 2, role: 'WAITER' });

    const { req, res, next } = makeReqRes({ authorization: 'Bearer waiter-token' });
    const middleware = authenticateStaff(['ADMIN', 'MANAGER']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('TC-MDW-07: Token hết hạn → trả 401', () => {
    jwtUtil.verifyAccessToken = jest.fn().mockReturnValue(null);

    const { req, res, next } = makeReqRes({ authorization: 'Bearer expired-staff-token' });
    const middleware = authenticateStaff(['ADMIN']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('TC-MDW-08: Không có Authorization header → trả 401', () => {
    const { req, res, next } = makeReqRes({});
    const middleware = authenticateStaff(['ADMIN']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 3: authorizeStaffRoles — RBAC middleware
// ─────────────────────────────────────────────────────────────
describe('Middleware — authorizeStaffRoles()', () => {

  it('TC-RBAC-01: ADMIN gọi endpoint chỉ dành cho ADMIN → next()', () => {
    const { req, res, next } = makeReqRes();
    req.user = { id: 1, role: 'ADMIN' };

    const middleware = authorizeStaffRoles(['ADMIN']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('TC-RBAC-02: MANAGER gọi endpoint dành cho MANAGER+ → next()', () => {
    const { req, res, next } = makeReqRes();
    req.user = { id: 2, role: 'MANAGER' };

    const middleware = authorizeStaffRoles(['ADMIN', 'MANAGER']);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('TC-RBAC-03: CASHIER gọi endpoint chỉ dành cho ADMIN → trả 403', () => {
    const { req, res, next } = makeReqRes();
    req.user = { id: 3, role: 'CASHIER' };

    const middleware = authorizeStaffRoles(['ADMIN']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalledWith();
  });

  it('TC-RBAC-04: WAITER gọi endpoint CASHIER+ → trả 403', () => {
    const { req, res, next } = makeReqRes();
    req.user = { id: 4, role: 'WAITER' };

    const middleware = authorizeStaffRoles(['CASHIER', 'MANAGER', 'ADMIN']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('TC-RBAC-05: KITCHEN gọi endpoint Staff → trả 403 (KITCHEN chỉ dùng /kds)', () => {
    const { req, res, next } = makeReqRes();
    req.user = { id: 5, role: 'KITCHEN' };

    const middleware = authorizeStaffRoles(['CASHIER', 'MANAGER', 'ADMIN', 'WAITER']);
    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─────────────────────────────────────────────────────────────
// NHÓM 4: Zod Validation — Customer Validator Schemas
// ─────────────────────────────────────────────────────────────
describe('Validation — scanSchema', () => {

  it('TC-VAL-01: qr_code không rỗng → pass validation', () => {
    const { req, res, next } = makeReqRes({}, { qr_code: 'QR-Ban-01-abc' });
    validate(scanSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('TC-VAL-02: qr_code là chuỗi rỗng → trả 400', () => {
    const { req, res, next } = makeReqRes({}, { qr_code: '' });
    validate(scanSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-03: Body thiếu qr_code → trả 400', () => {
    const { req, res, next } = makeReqRes({}, {});
    validate(scanSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Validation — createOrderSchema', () => {

  it('TC-VAL-04: Payload hợp lệ (items có menu_item_id, quantity) → pass', () => {
    const { req, res, next } = makeReqRes({}, {
      session_version: 1,
      items: [{ menu_item_id: 1, quantity: 2 }],
    });
    validate(createOrderSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('TC-VAL-05: items là mảng rỗng → trả 400 (min 1 item)', () => {
    const { req, res, next } = makeReqRes({}, { session_version: 1, items: [] });
    validate(createOrderSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-06: quantity = 0 → trả 400 (min 1)', () => {
    const { req, res, next } = makeReqRes({}, {
      session_version: 1,
      items: [{ menu_item_id: 1, quantity: 0 }],
    });
    validate(createOrderSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-07: quantity = 100 → trả 400 (max 99)', () => {
    const { req, res, next } = makeReqRes({}, {
      session_version: 1,
      items: [{ menu_item_id: 1, quantity: 100 }],
    });
    validate(createOrderSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-08: note vượt 500 ký tự → trả 400', () => {
    const { req, res, next } = makeReqRes({}, {
      session_version: 1,
      items: [{ menu_item_id: 1, quantity: 1, note: 'a'.repeat(501) }],
    });
    validate(createOrderSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-09: session_version là số âm → trả 400', () => {
    const { req, res, next } = makeReqRes({}, {
      session_version: -1,
      items: [{ menu_item_id: 1, quantity: 1 }],
    });
    validate(createOrderSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-10: Thiếu session_version → trả 400', () => {
    const { req, res, next } = makeReqRes({}, {
      items: [{ menu_item_id: 1, quantity: 1 }],
    });
    validate(createOrderSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Validation — createRequestSchema', () => {

  it('TC-VAL-11: request_type = CALL_STAFF → pass', () => {
    const { req, res, next } = makeReqRes({}, { request_type: 'CALL_STAFF' });
    validate(createRequestSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('TC-VAL-12: request_type = REQUEST_BILL → pass', () => {
    const { req, res, next } = makeReqRes({}, { request_type: 'REQUEST_BILL' });
    validate(createRequestSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('TC-VAL-13: request_type = INVALID_VALUE → trả 400', () => {
    const { req, res, next } = makeReqRes({}, { request_type: 'BRING_BEER' });
    validate(createRequestSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('Validation — getMenuSchema', () => {

  it('TC-VAL-14: station = GRILL (query param) → pass', () => {
    const { req, res, next } = makeReqRes({}, {}, { station: 'GRILL' });
    validate(getMenuSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('TC-VAL-15: station = INVALID → trả 400', () => {
    const { req, res, next } = makeReqRes({}, {}, { station: 'PIZZA' });
    validate(getMenuSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('TC-VAL-16: Không có query params → pass (đều optional)', () => {
    const { req, res, next } = makeReqRes({}, {}, {});
    validate(getMenuSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
