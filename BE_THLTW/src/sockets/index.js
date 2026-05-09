const { init } = require('./io');
const { verifyAccessToken } = require('../utils/jwt.util');
const db = require('../config/db');
const logger = require('../utils/logger');

module.exports = (server) => {
  const io = init(server);

  // Namespace: /customer
  const customerIo = io.of('/customer');
  customerIo.on('connection', (socket) => {
    logger.info('Customer connected', { socketId: socket.id });

    socket.on('join_session', ({ session_id }) => {
      socket.join(session_id);
      logger.info('Socket joined session', { socketId: socket.id, sessionId: session_id });
    });

    socket.on('disconnect', () => {
      logger.info('Customer disconnected', { socketId: socket.id });
    });
  });

  // Middleware auth for internal namespaces
  const authMiddleware = async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        logger.warn('Socket auth failed: Token missing', { socketId: socket.id });
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        logger.warn('Socket auth failed: Invalid token', { socketId: socket.id });
        return next(new Error('Authentication error: Invalid token'));
      }

      const { rows } = await db.query(
        'SELECT id, role, is_active FROM USERS WHERE id = $1',
        [decoded.id]
      );

      if (rows.length === 0 || !rows[0].is_active) {
        logger.warn('Socket auth failed: User not found or inactive', {
          socketId: socket.id,
          userId: decoded.id,
        });
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.user = {
        id: rows[0].id,
        role: rows[0].role,
      };

      logger.info('Socket authenticated', {
        socketId: socket.id,
        userId: socket.user.id,
        role: socket.user.role,
      });

      next();
    } catch (error) {
      logger.error('Socket auth error', {
        socketId: socket.id,
        error: error.message,
      });
      next(new Error('Authentication error: Internal error'));
    }
  };

  // Namespace: /kitchen
  const kitchenIo = io.of('/kitchen');
  kitchenIo.use(authMiddleware);
  kitchenIo.on('connection', (socket) => {
    logger.info('Kitchen connected', {
      socketId: socket.id,
      userId: socket.user.id,
    });

    if (!['ADMIN', 'KITCHEN'].includes(socket.user.role)) {
      logger.warn('Kitchen access denied: Invalid role', {
        socketId: socket.id,
        userId: socket.user.id,
        role: socket.user.role,
      });
      socket.disconnect(true);
      return;
    }

    socket.on('join_station', ({ station }) => {
      socket.join(station);
      logger.info('Socket joined station', {
        socketId: socket.id,
        userId: socket.user.id,
        station,
      });
    });

    socket.on('disconnect', () => {
      logger.info('Kitchen disconnected', {
        socketId: socket.id,
        userId: socket.user.id,
      });
    });
  });

  // Namespace: /staff
  const staffIo = io.of('/staff');
  staffIo.use(authMiddleware);
  staffIo.on('connection', (socket) => {
    logger.info('Staff connected', {
      socketId: socket.id,
      userId: socket.user.id,
    });

    if (!['ADMIN', 'STAFF'].includes(socket.user.role)) {
      logger.warn('Staff access denied: Invalid role', {
        socketId: socket.id,
        userId: socket.user.id,
        role: socket.user.role,
      });
      socket.disconnect(true);
      return;
    }

    socket.join('all-tables');

    socket.on('disconnect', () => {
      logger.info('Staff disconnected', {
        socketId: socket.id,
        userId: socket.user.id,
      });
    });
  });

  return io;
};
