function createResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function expectErrorShape(body) {
  expect(body).toEqual(
    expect.objectContaining({
      success: false,
      message: expect.any(String),
    })
  );
  expect(body).not.toHaveProperty('stack');
}

function expectValidationError(body) {
  expectErrorShape(body);
  expect(body).toEqual(
    expect.objectContaining({
      errors: expect.any(Array),
    })
  );
}

module.exports = {
  createResponse,
  expectErrorShape,
  expectValidationError,
};
