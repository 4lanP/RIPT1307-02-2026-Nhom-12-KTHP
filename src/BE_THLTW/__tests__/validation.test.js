const fs = require('fs');
const path = require('path');
const { validate } = require('../src/middlewares/validate.middleware');
const { scanSchema, createOrderSchema, createPaymentSchema } = require('../src/validators/customer.validator');
const { updateItemStatusSchema } = require('../src/validators/kds.validator');
const { revenueReportSchema, emptySchema } = require('../src/validators/admin.validator');
const { webhookPayloadSchema } = require('../src/validators/payment.validator');
const errorHandler = require('../src/middlewares/error.middleware');

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

function runValidation(schema, req) {
  const res = createResponse();
  const next = jest.fn();
  validate(schema)(req, res, next);
  return { res, next };
}

function expectValidationError(error, expectedFields = []) {
  const res = createResponse();
  errorHandler(error, createErrorRequest(), res, jest.fn());

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    success: false,
    message: expect.any(String),
    errors: expect.any(Array),
  }));

  const body = res.json.mock.calls[0][0];
  expectedFields.forEach((field) => {
    expect(body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field }),
    ]));
  });
}

describe('Validation middleware', () => {
  it('passes invalid body errors through shared error middleware', () => {
    const req = { body: {}, query: {}, params: {} };
    const { res, next } = runValidation(scanSchema, req);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expectValidationError(next.mock.calls[0][0], ['body.qr_code']);
  });

  it('accepts integer IDs for order payloads because schema uses SERIAL ids', () => {
    const req = {
      body: {
        session_version: 1,
        items: [
          {
            menu_item_id: 1,
            quantity: 2,
            options: [{ option_id: 1, quantity: 1 }],
          },
        ],
      },
      query: {},
      params: {},
    };
    const { res, next } = runValidation(createOrderSchema, req);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects UUID item IDs so clients do not send ids that DB cannot use', () => {
    const req = {
      body: {
        session_version: 1,
        items: [{ menu_item_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
      },
      query: {},
      params: {},
    };
    const { next } = runValidation(createOrderSchema, req);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expectValidationError(next.mock.calls[0][0], ['body.items.0.menu_item_id']);
  });

  it('accepts integer route params for KDS item status updates and writes parsed data back', () => {
    const req = {
      body: { new_status: 'READY' },
      query: {},
      params: { id: '1' },
    };
    const { res, next } = runValidation(updateItemStatusSchema, req);

    expect(req.params.id).toBe(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects admin revenue reports without dates before controller code runs', () => {
    const req = { body: {}, query: { group_by: 'day' }, params: {} };
    const { next } = runValidation(revenueReportSchema, req);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expectValidationError(next.mock.calls[0][0], ['query.from', 'query.to']);
  });

  it('accepts admin revenue report date filters and allowed grouping values', () => {
    ['day', 'week', 'month'].forEach((group_by) => {
      const req = {
        body: {},
        query: { from: '2026-05-01', to: '2026-05-24', group_by },
        params: {},
      };
      const { res, next } = runValidation(revenueReportSchema, req);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  it('rejects unsupported admin revenue report grouping values before controller code runs', () => {
    const req = {
      body: {},
      query: { from: '2026-05-01', to: '2026-05-24', group_by: 'quarter' },
      params: {},
    };
    const { next } = runValidation(revenueReportSchema, req);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expectValidationError(next.mock.calls[0][0], ['query.group_by']);
  });

  it('accepts empty endpoints and rejects unexpected query values', () => {
    const valid = runValidation(emptySchema, { body: {}, query: {}, params: {} });
    expect(valid.next).toHaveBeenCalledWith();

    const invalid = runValidation(emptySchema, { body: {}, query: { extra: '1' }, params: {} });
    expect(invalid.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('validates customer payment route payload shape', () => {
    const valid = runValidation(createPaymentSchema, { body: {}, query: {}, params: {} });
    expect(valid.next).toHaveBeenCalledWith();

    const invalid = runValidation(createPaymentSchema, { body: { amount: 1 }, query: {}, params: {} });
    expect(invalid.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('rejects malformed VNPay webhook callbacks', () => {
    const req = {
      body: {},
      query: {
        vnp_TxnRef: 'RES-123',
        vnp_Amount: 'not-number',
        vnp_ResponseCode: '00',
      },
      params: {},
    };
    const { next } = runValidation(webhookPayloadSchema, req);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expectValidationError(next.mock.calls[0][0], ['query.vnp_SecureHash', 'query.vnp_Amount']);
  });
});

describe('Route validation coverage', () => {
  const routeRoot = path.resolve(__dirname, '../src/routes');

  it('validates no-input customer endpoints explicitly', () => {
    const customerRoutes = fs.readFileSync(path.join(routeRoot, 'customer.routes.js'), 'utf8');

    expect(customerRoutes).toContain("router.get('/session', authenticateSession, validate(emptySchema), customerController.getSession)");
    expect(customerRoutes).toContain("router.get('/orders', authenticateSession, validate(emptySchema), customerController.getOrders)");
  });

  it('validates no-input staff endpoints explicitly', () => {
    const staffRoutes = fs.readFileSync(path.join(routeRoot, 'staff.routes.js'), 'utf8');

    expect(staffRoutes).toContain("router.get('/tables', validate(emptySchema), staffController.getTables)");
    expect(staffRoutes).toContain("router.get('/requests', validate(emptySchema), staffController.getRequests)");
  });

  it('validates no-input logout explicitly', () => {
    const authRoutes = fs.readFileSync(path.join(routeRoot, 'auth.routes.js'), 'utf8');

    expect(authRoutes).toContain("router.post('/logout', authenticateStaff(), validate(emptySchema), authController.logout)");
  });
});
