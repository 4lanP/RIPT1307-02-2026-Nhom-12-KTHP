const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockOf = jest.fn().mockReturnValue({ to: mockTo, emit: mockEmit });

jest.mock('../../src/sockets/io', () => ({
  getIO: () => ({ of: mockOf }),
}));

function createSocket(overrides = {}) {
  const handlers = {};
  return {
    id: 'socket-1',
    join: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    disconnect: jest.fn(),
    handshake: { auth: {} },
    handlers,
    ...overrides,
  };
}

module.exports = { mockEmit, mockTo, mockOf, createSocket };
