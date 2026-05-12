const { ValidationError } = require('../utils/errors');

// Generic validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body :
                   source === 'query' ? req.query :
                   source === 'params' ? req.params :
                   req[source];

      const validated = schema.parse(data);

      // Replace original data with validated (and potentially transformed) data
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else if (source === 'params') req.params = validated;
      else req[source] = validated;

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
};

// Validate multiple sources
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    try {
      const errors = [];

      for (const [source, schema] of Object.entries(schemas)) {
        try {
          const data = source === 'body' ? req.body :
                       source === 'query' ? req.query :
                       source === 'params' ? req.params :
                       req[source];

          const validated = schema.parse(data);

          if (source === 'body') req.body = validated;
          else if (source === 'query') req.query = validated;
          else if (source === 'params') req.params = validated;
          else req[source] = validated;
        } catch (error) {
          if (error.name === 'ZodError') {
            errors.push(...error.errors.map(err => ({
              source,
              field: err.path.join('.'),
              message: err.message,
            })));
          } else {
            throw error;
          }
        }
      }

      if (errors.length > 0) {
        next(new ValidationError('Validation failed', errors));
      } else {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validate,
  validateMultiple,
};
