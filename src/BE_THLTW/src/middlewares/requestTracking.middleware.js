const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

// Request ID middleware
const requestId = (req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);

  // Attach to logger context
  req.log = logger.child({ requestId: req.id });

  next();
};

// Response time middleware
const responseTime = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket?.remoteAddress,
    };

    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
    }

    if (duration > 1000) {
      logger.warn('Slow request detected', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else {
      logger.http('Request completed', logData);
    }
  });

  next();
};

module.exports = {
  requestId,
  responseTime,
};
