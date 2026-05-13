const errorHandler = require('../src/middlewares/error.middleware');
const { AppError, ValidationError } = require('../src/utils/errors');
const { createResponse, expectErrorShape, expectValidationError } = require('./helpers/responseAssertions');

function createRequest() {
  return {
    method: 'GET',
    originalUrl: '/api/test',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest'),
  };
}

describe('Unified error responses', () => {
  it('returns the standard shape for application errors', () => {
    const res = createResponse();

    errorHandler(new AppError('No access', 403), createRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expectErrorShape(body);
    expect(body).not.toHaveProperty('code');
  });

  it('returns validation details in the standard errors array', () => {
    const res = createResponse();
    const errors = [{ field: 'body.name', message: 'Required' }];

    errorHandler(new ValidationError('Invalid data', errors), createRequest(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expectValidationError(body);
    expect(body.errors).toEqual(errors);
  });
});
