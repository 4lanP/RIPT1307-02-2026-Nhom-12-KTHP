const { z } = require('zod');
const { ValidationError } = require('../utils/errors');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (Object.prototype.hasOwnProperty.call(parsed, 'body')) {
        req.body = parsed.body;
      }
      if (Object.prototype.hasOwnProperty.call(parsed, 'query')) {
        req.query = parsed.query;
      }
      if (Object.prototype.hasOwnProperty.call(parsed, 'params')) {
        req.params = parsed.params;
      }
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError('Du lieu khong hop le', errors));
      }
      return next(error);
    }
  };
};

module.exports = { validate };
