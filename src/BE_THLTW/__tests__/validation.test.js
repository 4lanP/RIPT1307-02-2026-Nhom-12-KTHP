const { validate } = require('../src/middlewares/validate.middleware');
const { scanSchema, createOrderSchema } = require('../src/validators/customer.validator');
const { updateItemStatusSchema } = require('../src/validators/kds.validator');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('Validation middleware', () => {
  it('returns 400 with Zod v4 issues for invalid body', () => {
    const req = { body: {}, query: {}, params: {} };
    const res = createResponse();
    const next = jest.fn();

    validate(scanSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.any(String),
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'body.qr_code' }),
      ]),
    }));
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
    const res = createResponse();
    const next = jest.fn();

    validate(createOrderSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
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
    const res = createResponse();
    const next = jest.fn();

    validate(createOrderSchema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'body.items.0.menu_item_id' }),
      ])
    );
  });

  it('accepts integer route params for KDS item status updates', () => {
    const req = {
      body: { new_status: 'READY' },
      query: {},
      params: { id: '1' },
    };
    const res = createResponse();
    const next = jest.fn();

    validate(updateItemStatusSchema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('writes parsed Zod data back to the request', () => {
    const req = {
      body: { new_status: 'READY' },
      query: {},
      params: { id: '1' },
    };
    const res = createResponse();
    const next = jest.fn();

    validate(updateItemStatusSchema)(req, res, next);

    expect(req.params.id).toBe(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
