const { z } = require('zod');
const { errorResponse } = require('../utils/response.util');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return errorResponse(res, 400, 'Dữ liệu không hợp lệ', errors);
      }
      next(error);
    }
  };
};

module.exports = { validate };
