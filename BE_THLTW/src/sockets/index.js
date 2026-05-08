const { init } = require('./io');
const { verifyAccessToken } = require('../utils/jwt.util');

module.exports = (server) => {
  const io = init(server);

  // Namespace: /customer
  const customerIo = io.of('/customer');
  customerIo.on('connection', (socket) => {
    console.log(`Customer connected: ${socket.id}`);

    socket.on('join_session', ({ session_id }) => {
      socket.join(session_id);
      console.log(`Socket ${socket.id} joined session ${session_id}`);
    });

    socket.on('disconnect', () => {
      console.log(`Customer disconnected: ${socket.id}`);
    });
  });

  // Middleware auth for internal namespaces
  const authMiddleware = (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: Token missing'));

    const decoded = verifyAccessToken(token);
    if (!decoded) return next(new Error('Authentication error: Invalid token'));

    // Bổ sung query DB để check role nếu cần thiết
    socket.user = decoded;
    next();
  };

  // Namespace: /kitchen
  const kitchenIo = io.of('/kitchen');
  kitchenIo.use(authMiddleware);
  kitchenIo.on('connection', (socket) => {
    console.log(`Kitchen connected: ${socket.id}`);

    socket.on('join_station', ({ station }) => {
      socket.join(station);
      console.log(`Socket ${socket.id} joined station ${station}`);
    });

    socket.on('disconnect', () => {
      console.log(`Kitchen disconnected: ${socket.id}`);
    });
  });

  // Namespace: /staff
  const staffIo = io.of('/staff');
  staffIo.use(authMiddleware);
  staffIo.on('connection', (socket) => {
    console.log(`Staff connected: ${socket.id}`);
    socket.join('all-tables');

    socket.on('disconnect', () => {
      console.log(`Staff disconnected: ${socket.id}`);
    });
  });

  return io;
};
