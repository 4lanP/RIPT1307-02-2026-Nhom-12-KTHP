const mockNamespaces = {};
const mockIo = {
  of: jest.fn((name) => {
    if (!mockNamespaces[name]) {
      mockNamespaces[name] = {
        use: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      };
    }
    return mockNamespaces[name];
  }),
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo),
}));

const { mockPool } = require('./helpers/mockDb');

jest.mock('../src/utils/jwt.util', () => ({
  verifyAccessToken: jest.fn(),
  verifySessionToken: jest.fn(),
}));

const { verifySessionToken } = require('../src/utils/jwt.util');
const logger = require('../src/utils/logger');

function createSocket() {
  const handlers = {};
  return {
    id: 'customer-socket-1',
    join: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    handlers,
  };
}

function getCustomerConnectionHandler() {
  const setupSockets = require('../src/sockets');
  setupSockets({});
  return mockNamespaces['/customer'].on.mock.calls.find(([event]) => event === 'connection')[1];
}

describe('Customer Socket.IO session join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockNamespaces).forEach((key) => delete mockNamespaces[key]);
  });

  it('joins the session room when token matches an active session', async () => {
    verifySessionToken.mockReturnValue({ session_id: 42, type: 'session' });
    mockPool.query.mockResolvedValue({ rows: [{ id: 42 }] });
    const socket = createSocket();
    getCustomerConnectionHandler()(socket);
    const ack = jest.fn();

    await socket.handlers.join_session({ session_id: 42, session_token: 'token' }, ack);

    expect(mockPool.query).toHaveBeenCalledWith(
      "SELECT id FROM SESSIONS WHERE id = $1 AND status = 'ACTIVE'",
      [42]
    );
    expect(socket.join).toHaveBeenCalledWith('42');
    expect(ack).toHaveBeenCalledWith({ success: true, message: 'Joined session' });
  });

  it('rejects a token for a different session', async () => {
    verifySessionToken.mockReturnValue({ session_id: 41, type: 'session' });
    const socket = createSocket();
    getCustomerConnectionHandler()(socket);
    const ack = jest.fn();

    await socket.handlers.join_session({ session_id: 42, session_token: 'token' }, ack);

    expect(mockPool.query).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ success: false, message: 'Invalid session credentials' });
  });

  it('rejects joins with missing credentials', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const socket = createSocket();
    getCustomerConnectionHandler()(socket);
    const ack = jest.fn();

    await socket.handlers.join_session({ session_id: 42 }, ack);

    expect(verifySessionToken).not.toHaveBeenCalled();
    expect(mockPool.query).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ success: false, message: 'Invalid session credentials' });
    expect(warnSpy).toHaveBeenCalledWith(
      'Customer join_session rejected: missing credentials',
      expect.objectContaining({ socketId: 'customer-socket-1' })
    );

    warnSpy.mockRestore();
  });

  it('rejects invalid tokens without logging token values', async () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    verifySessionToken.mockReturnValue(null);
    const socket = createSocket();
    getCustomerConnectionHandler()(socket);
    const ack = jest.fn();

    await socket.handlers.join_session({ session_id: 42, session_token: 'secret-token-value' }, ack);

    expect(mockPool.query).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ success: false, message: 'Invalid session credentials' });
    const [, logContext] = warnSpy.mock.calls.find(([message]) => message === 'Customer join_session rejected: invalid token');
    expect(logContext).toEqual(expect.objectContaining({
      socketId: 'customer-socket-1',
      sessionId: 42,
    }));
    expect(JSON.stringify(logContext)).not.toContain('secret-token-value');

    warnSpy.mockRestore();
  });

  it('rejects inactive sessions', async () => {
    verifySessionToken.mockReturnValue({ session_id: 42, type: 'session' });
    mockPool.query.mockResolvedValue({ rows: [] });
    const socket = createSocket();
    getCustomerConnectionHandler()(socket);
    const ack = jest.fn();

    await socket.handlers.join_session({ session_id: 42, session_token: 'token' }, ack);

    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ success: false, message: 'Session is not active' });
  });
});
